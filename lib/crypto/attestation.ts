/**
 * Attestation signing and verification.
 *
 * Canonical message body = { from, to, properties, nonce } — signature excluded.
 * Ed25519 signature is 64 bytes over the UTF-8 canonical serialization.
 */
import "server-only";
import { randomBytes, sign as nodeSign, verify as nodeVerify } from "node:crypto";
import { canonicalize } from "./canonical";
import {
  rawPrivateKeyToNode,
  rawPublicKeyToNode,
} from "./user";
import type {
  Attestation,
  AttestationBody,
  AttestationProperty,
  AttestationVerificationResult,
  Fingerprint,
  PublicKeyHex,
  User,
} from "@/types/primitives";
import { PROP } from "@/types/primitives";

export function attestationBody(
  from: Fingerprint,
  to: Fingerprint,
  properties: AttestationProperty[],
  nonce: string,
): AttestationBody {
  return { from, to, properties, nonce };
}

/** Canonical UTF-8 bytes signed by the issuer. */
export function canonicalAttestationBody(body: AttestationBody): Buffer {
  return Buffer.from(canonicalize(body), "utf8");
}

export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

/** Sign an attestation with the issuer's 32-byte private key seed. */
export function signAttestation(
  issuer: Pick<User, "fingerprint" | "privateKey">,
  to: Fingerprint,
  properties: AttestationProperty[],
  nonce: string = generateNonce(),
): Attestation {
  if (!issuer.privateKey) throw new Error("Cannot sign without a private key");

  const body = attestationBody(issuer.fingerprint, to, properties, nonce);
  const priv = rawPrivateKeyToNode(Buffer.from(issuer.privateKey, "hex"));
  const signature = nodeSign(null, canonicalAttestationBody(body), priv).toString(
    "hex",
  );

  return { from: issuer.fingerprint, to, properties, nonce, signature };
}

/** Verify an attestation signature using the issuer's public key. */
export function verifyAttestation(
  record: Attestation,
  issuerPublicKey: PublicKeyHex,
): boolean {
  try {
    const body = attestationBody(
      record.from,
      record.to,
      record.properties,
      record.nonce,
    );
    const pub = rawPublicKeyToNode(issuerPublicKey);
    return nodeVerify(
      null,
      canonicalAttestationBody(body),
      pub,
      Buffer.from(record.signature, "hex"),
    );
  } catch {
    return false;
  }
}

export function attestationId(record: Attestation): string {
  const id = record.properties.find((p) => p.key === PROP.CREDENTIAL_ID)?.value;
  return id ?? record.nonce.slice(0, 12);
}

/**
 * Verify all attestations for a resident:
 *  - signature valid against issuer's public key
 *  - `to` matches the resident fingerprint
 */
export function verifyAttestations(
  records: Attestation[],
  residentFingerprint: Fingerprint,
  resolvePublicKey: (fingerprint: Fingerprint) => PublicKeyHex | undefined,
): AttestationVerificationResult {
  const result: AttestationVerificationResult = {
    signaturesValid: true,
    targetsValid: true,
    entriesChecked: records.length,
    entries: [],
  };

  for (const record of records) {
    const pub = resolvePublicKey(record.from);
    const signatureValid = pub ? verifyAttestation(record, pub) : false;
    const targetValid = record.to === residentFingerprint;

    if (!signatureValid) result.signaturesValid = false;
    if (!targetValid) result.targetsValid = false;

    const id = attestationId(record);
    if ((!signatureValid || !targetValid) && !result.brokenAt) {
      result.brokenAt = id;
    }

    result.entries.push({
      id,
      signatureValid,
      targetValid,
      from: record.from,
    });
  }

  return result;
}

/** Build attestation properties for a TrustWallet credential. */
export function buildCredentialProperties(input: {
  credentialId: string;
  credentialType: string;
  issueDate: string;
  title: string;
  summary: string;
  issuerName: string;
  issuerType: string;
  metric?: string;
  periodStart?: string;
  periodEnd?: string;
  facts?: { label: string; value: string }[];
  corrects?: string;
  status?: string;
}): AttestationProperty[] {
  const props: AttestationProperty[] = [
    { key: PROP.CREDENTIAL_ID, value: input.credentialId },
    { key: PROP.TYPE, value: input.credentialType },
    { key: PROP.ISSUE_DATE, value: input.issueDate },
    { key: PROP.TITLE, value: input.title },
    { key: PROP.SUMMARY, value: input.summary },
    { key: PROP.ISSUER_NAME, value: input.issuerName },
    { key: PROP.ISSUER_TYPE, value: input.issuerType },
    { key: PROP.STATUS, value: input.status ?? "active" },
  ];
  if (input.metric) props.push({ key: PROP.METRIC, value: input.metric });
  if (input.periodStart)
    props.push({ key: PROP.PERIOD_START, value: input.periodStart });
  if (input.periodEnd) props.push({ key: PROP.PERIOD_END, value: input.periodEnd });
  if (input.corrects) props.push({ key: PROP.CORRECTS, value: input.corrects });
  for (const f of input.facts ?? []) {
    props.push({ key: PROP.FACT, value: `${f.label}:${f.value}` });
  }
  return props;
}

export function getProperty(
  record: Attestation,
  key: string,
): string | undefined {
  return record.properties.find((p) => p.key === key)?.value;
}

export function getAllProperties(
  record: Attestation,
  key: string,
): string[] {
  return record.properties.filter((p) => p.key === key).map((p) => p.value);
}
