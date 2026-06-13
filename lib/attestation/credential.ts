/**
 * Map signed Attestations to UI-facing Credentials and back.
 * Safe to import from client components (no node:crypto).
 */
import type {
  Attestation,
  AttestationVerificationResult,
  Credential,
  CredentialEvidence,
  CredentialStatus,
  CredentialType,
  IssuerType,
  VerificationResult,
} from "@/types";
import { PROP } from "@/types/primitives";

function prop(record: Attestation, key: string): string | undefined {
  return record.properties.find((p) => p.key === key)?.value;
}

function allProps(record: Attestation, key: string): string[] {
  return record.properties.filter((p) => p.key === key).map((p) => p.value);
}

export function credentialFromAttestation(
  record: Attestation,
  residentNote?: string,
): Credential {
  const facts = allProps(record, PROP.FACT).map((v) => {
    const i = v.indexOf(":");
    return i >= 0
      ? { label: v.slice(0, i), value: v.slice(i + 1) }
      : { label: v, value: "" };
  });

  const evidence: CredentialEvidence = {
    metric: prop(record, PROP.METRIC),
    periodStart: prop(record, PROP.PERIOD_START),
    periodEnd: prop(record, PROP.PERIOD_END),
    facts: facts.length ? facts : undefined,
  };

  return {
    id: prop(record, PROP.CREDENTIAL_ID) ?? record.nonce.slice(0, 12),
    residentFingerprint: record.to,
    issuerFingerprint: record.from,
    issuerName: prop(record, PROP.ISSUER_NAME) ?? "Unknown issuer",
    issuerType: (prop(record, PROP.ISSUER_TYPE) ?? "shelter") as IssuerType,
    credentialType: (prop(record, PROP.TYPE) ?? "program_participation") as CredentialType,
    issueDate: prop(record, PROP.ISSUE_DATE) ?? new Date().toISOString(),
    title: prop(record, PROP.TITLE) ?? "Untitled",
    summary: prop(record, PROP.SUMMARY) ?? "",
    evidence,
    residentNote,
    status: (prop(record, PROP.STATUS) ?? "active") as CredentialStatus,
    corrects: prop(record, PROP.CORRECTS),
    attestation: record,
  };
}

/** Adapt attestation verification to the legacy VerificationResult UI shape. */
export function toVerificationResult(
  r: AttestationVerificationResult,
): VerificationResult {
  const chainValid = r.signaturesValid && r.targetsValid;
  return {
    chainValid,
    signaturesValid: r.signaturesValid,
    entriesChecked: r.entriesChecked,
    brokenAt: r.brokenAt,
    entries: r.entries.map((e) => ({
      id: e.id,
      hashValid: true,
      linkValid: e.targetValid,
      signatureValid: e.signatureValid,
    })),
  };
}

export function credentialsFromAttestations(
  records: Attestation[],
  notes?: Map<string, string>,
): Credential[] {
  return records.map((r) => {
    const id = prop(r, PROP.CREDENTIAL_ID) ?? r.nonce.slice(0, 12);
    return credentialFromAttestation(r, notes?.get(id));
  });
}
