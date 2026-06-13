import { createHash, sign as nodeSign, verify as nodeVerify } from "node:crypto";
import { canonicalMessageBytes, canonicalizeMessageBody } from "./canonical";
import { base64UrlDecode, base64UrlEncode, randomBase64Url } from "./encoding";
import { deriveFingerprint, publicKeyFromPrivateSeed, rawPrivateKeyToNode, rawPublicKeyToNode } from "./identity";
import { appendChainLink, validateTypedPayload } from "./payload";
import type {
  AnchorMessageBody,
  AnchorSignedMessage,
  MessageVerificationResult,
  TypedMessageInput,
  VerificationCheck,
} from "./types";

export function computeMessageFingerprint(body: AnchorMessageBody): string {
  const bytes = canonicalMessageBytes(body);
  return createHash("sha512").update(bytes).digest().subarray(0, 8).toString("hex");
}

export function createMessageBody(input: Omit<TypedMessageInput, "signerPrivateKey">): AnchorMessageBody {
  return {
    v: 1,
    from: input.from,
    to: input.to,
    nonce: input.nonce ?? randomBase64Url(16),
    payload: appendChainLink(input.previous, input.payload),
  };
}

export function signMessage(body: AnchorMessageBody, signerPrivateKey: string): AnchorSignedMessage {
  const publicKey = publicKeyFromPrivateSeed(signerPrivateKey);
  const signerFingerprint = deriveFingerprint(publicKey);
  if (signerFingerprint !== body.from) {
    throw new Error("Signer private key does not match body.from");
  }
  const bytes = canonicalMessageBytes(body);
  const sig = nodeSign(null, bytes, rawPrivateKeyToNode(signerPrivateKey));
  return {
    body,
    fp: computeMessageFingerprint(body),
    sig: base64UrlEncode(sig),
    signerPk: base64UrlEncode(publicKey),
  };
}

export function signTypedMessage(input: TypedMessageInput): AnchorSignedMessage {
  return signMessage(createMessageBody(input), input.signerPrivateKey);
}

export function verifyMessage(message: AnchorSignedMessage): MessageVerificationResult {
  const checks: VerificationCheck[] = [];
  let publicKey: Buffer | undefined;
  let canonical: string | undefined;

  try {
    publicKey = base64UrlDecode(message.signerPk, 32);
    checks.push(ok("signer_public_key_decodes", "Signer public key decodes"));
  } catch (error) {
    checks.push(fail("signer_public_key_decodes", errorMessage(error)));
  }

  if (publicKey) {
    const fingerprint = deriveFingerprint(publicKey);
    checks.push(
      fingerprint === message.body.from
        ? ok("signer_fingerprint_matches", "Signer fingerprint matches body.from")
        : fail("signer_fingerprint_matches", "Signer public key fingerprint does not match body.from"),
    );
  }

  try {
    canonical = canonicalizeMessageBody(message.body);
    checks.push(ok("canonical_body_valid", "Canonical body is valid"));
    const expectedFp = computeMessageFingerprint(message.body);
    checks.push(
      expectedFp === message.fp
        ? ok("message_fingerprint_matches", "Message fingerprint matches canonical body")
        : fail("message_fingerprint_matches", "Message fingerprint does not match canonical body"),
    );
  } catch (error) {
    checks.push(fail("canonical_body_valid", errorMessage(error)));
  }

  if (publicKey && canonical) {
    try {
      const signatureValid = nodeVerify(
        null,
        Buffer.from(canonical, "utf8"),
        rawPublicKeyToNode(publicKey),
        base64UrlDecode(message.sig, 64),
      );
      checks.push(
        signatureValid
          ? ok("signature_valid", "Signature verifies over canonical body")
          : fail("signature_valid", "Signature does not verify over canonical body"),
      );
    } catch (error) {
      checks.push(fail("signature_valid", errorMessage(error)));
    }
  } else {
    checks.push(fail("signature_valid", "Signature could not be checked"));
  }

  const schemaErrors = validateTypedPayload(message.body.payload);
  checks.push(
    schemaErrors.length === 0
      ? ok("schema_valid", "Payload schema is valid")
      : fail("schema_valid", schemaErrors.join("; ")),
  );

  return {
    valid: checks.every((check) => check.ok || check.severity !== "error"),
    checks,
    canonical,
  };
}

function ok(name: string, message: string): VerificationCheck {
  return { name, ok: true, severity: "info", message };
}

function fail(name: string, message: string): VerificationCheck {
  return { name, ok: false, severity: "error", message };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown verification error";
}
