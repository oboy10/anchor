import { messageType, payloadInteger, payloadString } from "./payload";
import type {
  AnchorIdentity,
  AnchorProtocolContext,
  AnchorSignedMessage,
  MetricSummary,
  SignerChainState,
  TrustSummary,
} from "./types";

interface SummaryInput {
  messages: AnchorSignedMessage[];
  activeMessages: AnchorSignedMessage[];
  disputed: Map<string, AnchorSignedMessage[]>;
  revoked: Map<string, AnchorSignedMessage>;
  chainStates: SignerChainState[];
  subjectFingerprint: string;
  context?: AnchorProtocolContext;
}

export function computeTrustSummary(input: SummaryInput): TrustSummary {
  const identityAssurance = metricIdentityAssurance(input);
  const evidenceStrength = metricEvidenceStrength(input);
  const housingReliability = metricHousingReliability(input);
  const recommenderCredibility = metricRecommenderCredibility(input);
  const referenceStrength = metricReferenceStrength(input, recommenderCredibility.score);
  const chainIntegrity = metricChainIntegrity(input.chainStates);
  const freshnessAndStanding = metricFreshnessAndStanding(input);

  return {
    metrics: {
      identityAssurance,
      evidenceStrength,
      housingReliability,
      referenceStrength,
      recommenderCredibility,
      chainIntegrity,
      freshnessAndStanding,
    },
  };
}

function metricIdentityAssurance(input: SummaryInput): MetricSummary {
  let score = 0;
  const reasons: string[] = [];
  const identityMessages = activeOfType(input, "identity").filter(
    (message) => message.body.to === input.subjectFingerprint && message.body.from !== input.subjectFingerprint,
  );
  const issuers = new Set(identityMessages.map((message) => message.body.from));
  if (identityMessages.length > 0) add(35, "Independent identity attestation is present");
  if (identityMessages.some((message) => payloadString(message.body.payload, "a.id:email"))) {
    add(20, "Attested email is present");
  }
  if (
    identityMessages.some(
      (message) =>
        payloadString(message.body.payload, "a.id:first_name") &&
        payloadString(message.body.payload, "a.id:last_name"),
    )
  ) {
    add(20, "Legal-name identity bundle is present");
  }
  if (input.context?.verifierConfirmedServices?.includes(input.subjectFingerprint)) {
    add(10, "Verifier confirmed an attached service endpoint");
  }
  if (issuers.size >= 2) add(15, "Two or more independent identity issuers contributed");
  if (hasUnresolvedDispute(input, identityMessages.map((message) => message.fp))) {
    score -= 30;
  }
  return summarize(score, reasons, disputeFlags(input, identityMessages.map((message) => message.fp)));

  function add(points: number, reason: string) {
    score += points;
    reasons.push(reason);
  }
}

function metricEvidenceStrength(input: SummaryInput): MetricSummary {
  let score = 0;
  const reasons: string[] = [];
  if (input.activeMessages.length > 0) add(20, "At least one valid signed attestation is included");
  if (input.activeMessages.some((message) => issuerIsOrg(input, message.body.from))) {
    add(20, "Organization-issued attestation is included");
  }
  if (activeOfType(input, "rent_history").length || activeOfType(input, "payment_history").length) {
    add(20, "Housing or payment history evidence is included");
  }
  if (new Set(input.activeMessages.map((message) => message.body.from)).size >= 2) {
    add(20, "At least two independent issuers contributed");
  }
  if (activeOfType(input, "outcome").some((message) => payloadString(message.body.payload, "a.out:related"))) {
    add(20, "Related outcome evidence backs a prior claim");
  }
  return summarize(score, reasons, []);

  function add(points: number, reason: string) {
    score += points;
    reasons.push(reason);
  }
}

function metricHousingReliability(input: SummaryInput): MetricSummary {
  const housing = [...activeOfType(input, "rent_history"), ...activeOfType(input, "payment_history")];
  let score = housing.length ? 50 : 0;
  const reasons = housing.length ? ["Housing or payment history is present"] : ["No housing history is included"];
  const maxOnTime = Math.max(0, ...housing.map((message) => payloadInteger(message.body.payload, "a.rent:on_time_count") ?? 0));
  if (maxOnTime >= 12) add(30, "At least 12 on-time payments are attested");
  else if (maxOnTime >= 6) add(20, "At least 6 on-time payments are attested");
  else if (maxOnTime >= 3) add(10, "At least 3 on-time payments are attested");
  const late = housing.some((message) => (payloadInteger(message.body.payload, "a.rent:late_count") ?? 0) > 0);
  if (late) {
    score -= 15;
    reasons.push("Late payments are disclosed");
  }
  if (hasNegativeHousingOutcome(input)) score -= 15;
  if (hasPositiveOutcome(input)) add(10, "Positive outcome corroborates the housing evidence");
  return summarize(score, reasons, []);

  function add(points: number, reason: string) {
    score += points;
    reasons.push(reason);
  }
}

function metricReferenceStrength(input: SummaryInput, recommenderScore: number): MetricSummary {
  let score = 0;
  const references = activeOfType(input, "reference");
  const reasons: string[] = [];
  const recommenders = new Set(references.map((message) => message.body.from));
  const relationships = new Set(
    references
      .map((message) => payloadString(message.body.payload, "a.ref:relationship"))
      .filter(Boolean),
  );
  if (recommenders.size >= 2) add(25, "At least two independent recommenders are included");
  if (relationships.size >= 2) add(20, "References span multiple relationship categories");
  if (references.some((message) => outcomeBacksMessage(input, message.fp))) {
    add(20, "At least one reference is outcome-backed");
  }
  const credibilityContribution = Math.round((Math.max(0, Math.min(100, recommenderScore)) / 100) * 35);
  add(credibilityContribution, "Weighted recommender credibility contributes to reference strength");
  return summarize(score, reasons, []);

  function add(points: number, reason: string) {
    score += points;
    if (points > 0) reasons.push(reason);
  }
}

function metricRecommenderCredibility(input: SummaryInput): MetricSummary {
  const references = activeOfType(input, "reference");
  if (references.length === 0) return summarize(0, ["No references are included"], []);

  let weighted = 0;
  let totalWeight = 0;
  const flags: string[] = [];
  for (const reference of references) {
    const relationship = payloadString(reference.body.payload, "a.ref:relationship")?.toLowerCase() ?? "";
    const weight = /landlord|caseworker|nonprofit/.test(relationship) ? 1 : 0.6;
    weighted += recommenderScore(input, reference.body.from, flags) * weight;
    totalWeight += weight;
  }

  const score = totalWeight ? Math.round(weighted / totalWeight) : 0;
  return summarize(score, ["Reference issuers are weighted by credibility and relationship type"], flags);
}

function recommenderScore(input: SummaryInput, recommender: string, flags: string[]): number {
  let score = 20;
  if (activeOfType(input, "identity").some((message) => message.body.to === recommender)) score += 20;
  if (issuerIsOrg(input, recommender) || hasOrgBackedIdentity(input, recommender)) score += 15;

  const referencesByRecommender = activeOfType(input, "reference").filter(
    (message) => message.body.from === recommender,
  );
  const relatedOutcomes = activeOfType(input, "outcome").filter((message) => {
    const related = payloadString(message.body.payload, "a.out:related");
    return referencesByRecommender.some((reference) => reference.fp === related);
  });
  const positive = relatedOutcomes.filter((message) =>
    positiveResult(payloadString(message.body.payload, "a.out:result")),
  ).length;
  score += Math.round(((positive + 2) / (relatedOutcomes.length + 4)) * 30);

  const chainStatus = input.chainStates.find((state) => state.signer === recommender)?.status ?? "standalone";
  if (chainStatus === "healthy") score += 10;
  else if (chainStatus === "partial") score += 5;
  else if (chainStatus === "orphaned") score -= 20;
  else if (["forked", "cyclic", "tampered"].includes(chainStatus)) score -= 40;

  const disputes = referencesByRecommender.filter((message) => input.disputed.has(message.fp)).length;
  if (disputes) score -= Math.min(15, disputes * 5);

  const clusterPenalty =
    referencesByRecommender.length > 0 &&
    !referencesByRecommender.some((message) => outcomeBacksMessage(input, message.fp)) &&
    !issuerIsOrg(input, recommender) &&
    referencesByRecommender.every((message) =>
      /peer|community|friend/.test(payloadString(message.body.payload, "a.ref:relationship")?.toLowerCase() ?? ""),
    );
  if (clusterPenalty) {
    score -= 15;
    flags.push(`Recommender ${recommender} has peer-only evidence without organization or outcome backing`);
  }
  return clamp(score);
}

function metricChainIntegrity(chainStates: SignerChainState[]): MetricSummary {
  const statuses = chainStates.map((state) => state.status);
  if (statuses.some((status) => ["forked", "cyclic", "tampered"].includes(status))) {
    return summarize(0, ["At least one signer chain has a hard integrity failure"], []);
  }
  if (statuses.some((status) => status === "orphaned")) {
    return summarize(45, ["A signer chain references missing history"], []);
  }
  if (
    statuses.every((status) => status === "healthy" || status === "standalone") &&
    statuses.some((status) => status === "healthy")
  ) {
    return summarize(100, ["Observed signer chains are healthy or standalone"], []);
  }
  if (statuses.every((status) => status === "standalone" || status === "partial")) {
    return summarize(70, ["Only standalone or partial signer chains are observed"], []);
  }
  return summarize(70, ["At least one signer chain has partial observed context"], []);
}

function metricFreshnessAndStanding(input: SummaryInput): MetricSummary {
  let score = input.activeMessages.length ? 50 : 0;
  const reasons = input.activeMessages.length ? ["Active attestation evidence is present"] : ["No active attestations are included"];
  const now = Date.now();
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  if (
    [...activeOfType(input, "rent_history"), ...activeOfType(input, "payment_history"), ...activeOfType(input, "reference")].some(
      (message) => ageMs(message, now) <= 6 * monthMs,
    )
  ) {
    score += 20;
    reasons.push("Housing-relevant evidence is newer than 6 months");
  }
  if (activeOfType(input, "outcome").some((message) => positiveResult(payloadString(message.body.payload, "a.out:result")) && ageMs(message, now) <= 12 * monthMs)) {
    score += 15;
    reasons.push("A positive outcome is newer than 12 months");
  }
  if (input.revoked.size) score -= 25;
  if (input.disputed.size) score -= 20;
  if (input.activeMessages.length && input.activeMessages.every((message) => ageMs(message, now) > 24 * monthMs)) {
    score -= 10;
    reasons.push("All evidence is older than 24 months");
  }
  return summarize(score, reasons, [
    ...[...input.revoked.keys()].map((fp) => `Message ${fp} has an unresolved revocation`),
    ...[...input.disputed.keys()].map((fp) => `Message ${fp} has an unresolved dispute`),
  ]);
}

function activeOfType(input: SummaryInput, type: string): AnchorSignedMessage[] {
  return input.activeMessages.filter((message) => messageType(message.body.payload) === type);
}

function issuerIsOrg(input: SummaryInput, fingerprint: string): boolean {
  const identity = findIdentity(input.context, fingerprint);
  return identity?.entityType === "org" || identity?.entityType === "service";
}

function hasOrgBackedIdentity(input: SummaryInput, recommender: string): boolean {
  return activeOfType(input, "identity").some(
    (message) => message.body.to === recommender && issuerIsOrg(input, message.body.from),
  );
}

function findIdentity(context: AnchorProtocolContext | undefined, fingerprint: string): AnchorIdentity | undefined {
  return context?.identities?.find((identity) => identity.fingerprint === fingerprint);
}

function outcomeBacksMessage(input: SummaryInput, fp: string): boolean {
  return activeOfType(input, "outcome").some(
    (message) => payloadString(message.body.payload, "a.out:related") === fp,
  );
}

function hasPositiveOutcome(input: SummaryInput): boolean {
  return activeOfType(input, "outcome").some((message) =>
    positiveResult(payloadString(message.body.payload, "a.out:result")),
  );
}

function hasNegativeHousingOutcome(input: SummaryInput): boolean {
  return activeOfType(input, "outcome").some((message) => {
    const kind = payloadString(message.body.payload, "a.out:kind")?.toLowerCase() ?? "";
    const result = payloadString(message.body.payload, "a.out:result")?.toLowerCase() ?? "";
    return kind.includes("housing") && /negative|upheld|failed|late|eviction/.test(result);
  });
}

function positiveResult(result?: string): boolean {
  return /positive|good|approved|completed|upheld_positive|stable|success/i.test(result ?? "");
}

function hasUnresolvedDispute(input: SummaryInput, fps: string[]): boolean {
  return fps.some((fp) => input.disputed.has(fp));
}

function disputeFlags(input: SummaryInput, fps: string[]): string[] {
  return fps.filter((fp) => input.disputed.has(fp)).map((fp) => `Message ${fp} has an unresolved dispute`);
}

function ageMs(message: AnchorSignedMessage, now: number): number {
  const ts = payloadString(message.body.payload, "a:ts");
  const time = ts ? Date.parse(ts) : Number.NaN;
  return Number.isFinite(time) ? now - time : Number.POSITIVE_INFINITY;
}

function summarize(score: number, reasons: string[], flags: string[]): MetricSummary {
  const clamped = clamp(score);
  return {
    score: clamped,
    band: clamped < 25 ? "low" : clamped < 50 ? "developing" : clamped < 75 ? "solid" : "strong",
    reasons: (reasons.length ? reasons : ["No matching evidence is included"]).slice(0, 5),
    flags: flags.slice(0, 5),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
