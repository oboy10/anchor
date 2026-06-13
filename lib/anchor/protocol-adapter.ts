import {
  signTypedMessage as protocolSignTypedMessage,
  validateIdentity as protocolValidateIdentity,
  verifyMessage,
  verifyPresentationBundle as protocolVerifyPresentationBundle,
} from "@/lib/anchor/protocol";
import type {
  AnchorIdentity,
  AnchorProtocolAdapter,
  AnchorSignedMessage,
  PublicAnchorContext,
} from "./types";

function isIdentityLike(value: unknown): value is AnchorIdentity {
  if (!value || typeof value !== "object") return false;
  const identity = value as Partial<AnchorIdentity>;
  return (
    identity.alg === "Ed25519" &&
    typeof identity.publicKey === "string" &&
    typeof identity.fingerprint === "string" &&
    (identity.entityType === "person" ||
      identity.entityType === "org" ||
      identity.entityType === "service")
  );
}

function toProtocolIdentities(context?: PublicAnchorContext): AnchorIdentity[] {
  return (
    context?.identities.map((identity) => ({
      alg: "Ed25519",
      publicKey: identity.publicKey,
      fingerprint: identity.fingerprint,
      entityType: identity.entityType,
      displayName: identity.displayLabel,
      services: identity.services,
    })) ?? []
  );
}

function toProtocolContext(context?: PublicAnchorContext) {
  const identities = toProtocolIdentities(context);
  return {
    identities,
    verifierConfirmedServices: identities
      .filter((identity) => identity.services?.some((service) => service.verified))
      .map((identity) => identity.fingerprint),
    partialContext: true,
  };
}

function checksFromProtocol(
  checks: ReturnType<typeof verifyMessage>["checks"],
): { name: string; ok: boolean; detail?: string }[] {
  return checks.map((check) => ({
    name: check.name,
    ok: check.ok,
    detail: check.message,
  }));
}

function flagsFromMessage(message: AnchorSignedMessage): string[] {
  return verifyMessage(message)
    .checks.filter((check) => !check.ok)
    .map((check) => check.message);
}

export const anchorProtocolAdapter: AnchorProtocolAdapter = {
  async validateIdentity(identityLike) {
    if (!isIdentityLike(identityLike)) {
      return {
        valid: false,
        errors: ["Identity must be an Ed25519 public identity."],
      };
    }

    const valid = protocolValidateIdentity(identityLike);
    return {
      valid,
      normalized: valid ? identityLike : undefined,
      errors: valid ? [] : ["Identity fingerprint does not match the supplied public key."],
    };
  },

  async registerPublicIdentity(identityLike) {
    return this.validateIdentity(identityLike);
  },

  async signTypedMessage(input) {
    if (!input.signerPrivateKey) {
      throw new Error("Server-side signing requires an explicit demo signer private key.");
    }
    const payload = [
      { k: "a:type", v: input.type },
      { k: "a:ts", v: new Date().toISOString() },
      ...input.payload.filter((entry) => entry.k !== "a:type" && entry.k !== "a:ts"),
    ];
    return protocolSignTypedMessage({
      from: input.issuer.fingerprint,
      to: input.subject.fingerprint,
      signerPrivateKey: input.signerPrivateKey,
      previous: input.previousMessageFp,
      payload,
    });
  },

  async verifySignedMessage(input) {
    const result = verifyMessage(input);
    return {
      valid: result.valid,
      checks: checksFromProtocol(result.checks),
      signerChainStates: { [input.body.from]: "standalone" },
      flags: flagsFromMessage(input),
    };
  },

  async verifyPresentationBundle(bundle) {
    const result = protocolVerifyPresentationBundle(bundle, {
      identities: bundle.relatedKeys,
      partialContext: true,
    });
    return {
      valid: result.valid,
      checks: checksFromProtocol(result.checks),
      signerChainStates: Object.fromEntries(
        result.signerChainStates.map((state) => [state.signer, state.status]),
      ),
      flags: result.flags,
    };
  },

  async computeTrustSummary(bundle, context) {
    return protocolVerifyPresentationBundle(bundle, toProtocolContext(context)).trustSummary;
  },
};
