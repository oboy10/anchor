import { randomBytes } from "node:crypto";
import type {
  AnchorChainState,
  AnchorIdentity,
  AnchorMetricName,
  AnchorProtocolAdapter,
  AnchorSignedMessage,
  MetricSummary,
  PublicAnchorContext,
  TrustSummaryView,
} from "./types";

const METRICS: AnchorMetricName[] = [
  "identityAssurance",
  "evidenceStrength",
  "housingReliability",
  "referenceStrength",
  "recommenderCredibility",
  "chainIntegrity",
  "freshnessAndStanding",
];

function band(score: number): MetricSummary["band"] {
  if (score < 25) return "low";
  if (score < 50) return "developing";
  if (score < 75) return "solid";
  return "strong";
}

function metric(score: number, reason: string, flags: string[] = []): MetricSummary {
  return { score, band: band(score), reasons: [reason], flags };
}

function isIdentity(value: unknown): value is AnchorIdentity {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AnchorIdentity>;
  return (
    v.alg === "Ed25519" &&
    typeof v.publicKey === "string" &&
    /^[0-9a-f]{16}$/.test(v.fingerprint ?? "") &&
    (v.entityType === "person" || v.entityType === "org" || v.entityType === "service")
  );
}

function messageType(message: AnchorSignedMessage): string | undefined {
  return message.body.payload.find((entry) => entry.k === "a:type")?.v as
    | string
    | undefined;
}

function staticSummary(score: number, reason: string): TrustSummaryView {
  return {
    metrics: Object.fromEntries(
      METRICS.map((name) => [name, metric(score, reason)]),
    ) as TrustSummaryView["metrics"],
  };
}

/**
 * Temporary Agent-B boundary implementation for local demo and route testing.
 * It is intentionally marked unsafe and must be replaced by the protocol package
 * for production cryptographic validation, signing, chain checks, and scoring.
 */
export function createUnsafeDemoAnchorProtocolAdapter(): AnchorProtocolAdapter {
  return {
    async validateIdentity(identityLike) {
      if (!isIdentity(identityLike)) {
        return {
          valid: false,
          errors: ["Identity must be an Ed25519 public identity with a 16-char fingerprint."],
        };
      }
      return { valid: true, normalized: identityLike, errors: [] };
    },

    async registerPublicIdentity(identityLike) {
      return this.validateIdentity(identityLike);
    },

    async signTypedMessage(input) {
      const nonce = randomBytes(16).toString("base64url");
      const fp = randomBytes(8).toString("hex");
      const payload = [
        { k: "a:type", v: input.type },
        { k: "a:ts", v: new Date().toISOString() },
        ...(input.previousMessageFp
          ? [{ k: "a.ch:prev", v: input.previousMessageFp }]
          : []),
        ...input.payload.filter((entry) => entry.k !== "a:type"),
      ];
      return {
        body: {
          v: 1,
          from: input.issuer.fingerprint,
          to: input.subject.fingerprint,
          nonce,
          payload,
        },
        fp,
        sig: `unsafe-demo-signature.${fp}`,
        signerPk: input.issuer.publicKey,
      };
    },

    async verifySignedMessage(input) {
      const valid = input.sig === `unsafe-demo-signature.${input.fp}`;
      return {
        valid,
        checks: [{ name: "unsafe-demo-signature", ok: valid }],
        signerChainStates: { [input.body.from]: "standalone" },
        flags: valid ? ["Using unsafe demo protocol adapter."] : ["Invalid demo signature."],
      };
    },

    async verifyPresentationBundle(bundle) {
      const bad = bundle.messages.filter(
        (message) => message.sig !== `unsafe-demo-signature.${message.fp}`,
      );
      const signerChainStates = Object.fromEntries(
        bundle.messages.map((message) => [
          message.body.from,
          message.body.payload.some((entry) => entry.k === "a.ch:prev")
            ? "healthy"
            : "standalone",
        ]),
      ) as Record<string, AnchorChainState>;
      return {
        valid: bad.length === 0,
        checks: [
          { name: "bundle-version", ok: bundle.v === 1 },
          { name: "message-demo-signatures", ok: bad.length === 0 },
        ],
        signerChainStates,
        flags:
          bad.length === 0
            ? ["Using unsafe demo protocol adapter."]
            : ["One or more messages failed demo validation."],
      };
    },

    async computeTrustSummary(bundle, context: PublicAnchorContext) {
      if (bundle.messages.length === 0) {
        return staticSummary(0, "No disclosed messages were included.");
      }
      const types = new Set(bundle.messages.map(messageType));
      const independentIssuers = new Set(bundle.messages.map((m) => m.body.from)).size;
      return {
        metrics: {
          identityAssurance: metric(
            types.has("identity") ? 70 : 35,
            types.has("identity")
              ? "Bundle includes an identity attestation."
              : "Identity evidence is present only through related public metadata.",
          ),
          evidenceStrength: metric(
            Math.min(90, 20 + independentIssuers * 20),
            `${independentIssuers} independent signer(s) contributed evidence.`,
          ),
          housingReliability: metric(
            types.has("rent_history") || types.has("payment_history") ? 85 : 35,
            "Housing reliability is delegated to the protocol adapter.",
          ),
          referenceStrength: metric(
            types.has("reference") ? 78 : 30,
            "Reference evidence is delegated to the protocol adapter.",
          ),
          recommenderCredibility: metric(
            context.demoOutcomes.length > 0 ? 76 : 45,
            "Recommender credibility is delegated to the protocol adapter.",
          ),
          chainIntegrity: metric(
            bundle.messages.some((m) => m.body.payload.some((entry) => entry.k === "a.ch:prev"))
              ? 100
              : 70,
            "Demo chain states were returned by the protocol adapter.",
          ),
          freshnessAndStanding: metric(
            80,
            "Freshness and standing are delegated to the protocol adapter.",
          ),
        },
      };
    },
  };
}

export const anchorProtocolAdapter = createUnsafeDemoAnchorProtocolAdapter();
