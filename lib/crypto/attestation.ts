/**
 * Attestation signing and verification.
 *
 * Canonical message body = { from, to, properties, nonce } — signature excluded.
 * Ed25519 signature is 64 bytes over the UTF-8 canonical serialization.
 *
 * Cross-platform: WebCrypto + Uint8Array only (no node:crypto, no server-only),
 * so signing/verifying works in the browser as well as on the server. Signing
 * and verification are async because SubtleCrypto is async.
 */
import {
  bytesToHex,
  hexToBytes,
  randomBytes,
  subtle,
  utf8ToBytes,
} from "./bytes";
import { canonicalize } from "./canonical";
import { importPrivateKey, importPublicKey } from "./user";
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
export function canonicalAttestationBody(
  body: AttestationBody,
): Uint8Array<ArrayBuffer> {
  return utf8ToBytes(canonicalize(body));
}

export function generateNonce(): string {
  return bytesToHex(randomBytes(16));
}

/** Sign an attestation with the issuer's 32-byte private key seed. */
export async function signAttestation(
  issuer: Pick<User, "fingerprint" | "privateKey">,
  to: Fingerprint,
  properties: AttestationProperty[],
  nonce: string = generateNonce(),
): Promise<Attestation> {
  if (!issuer.privateKey) throw new Error("Cannot sign without a private key");

  const body = attestationBody(issuer.fingerprint, to, properties, nonce);
  const priv = await importPrivateKey(hexToBytes(issuer.privateKey));
  const sig = await subtle.sign("Ed25519", priv, canonicalAttestationBody(body));
  const signature = bytesToHex(new Uint8Array(sig));

  return { from: issuer.fingerprint, to, properties, nonce, signature };
}

/** Verify an attestation signature using the issuer's public key. */
export async function verifyAttestation(
  record: Attestation,
  issuerPublicKey: PublicKeyHex,
): Promise<boolean> {
  try {
    const body = attestationBody(
      record.from,
      record.to,
      record.properties,
      record.nonce,
    );
    const pub = await importPublicKey(issuerPublicKey);
    return await subtle.verify(
      "Ed25519",
      pub,
      hexToBytes(record.signature),
      canonicalAttestationBody(body),
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
export async function verifyAttestations(
  records: Attestation[],
  residentFingerprint: Fingerprint,
  resolvePublicKey: (fingerprint: Fingerprint) => PublicKeyHex | undefined,
): Promise<AttestationVerificationResult> {
  const result: AttestationVerificationResult = {
    signaturesValid: true,
    targetsValid: true,
    entriesChecked: records.length,
    entries: [],
  };

  for (const record of records) {
    const pub = resolvePublicKey(record.from);
    const signatureValid = pub ? await verifyAttestation(record, pub) : false;
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
