import { messageType, payloadString } from "./payload";
import type { AnchorSignedMessage } from "./types";

export interface MessageResolution {
  activeMessages: AnchorSignedMessage[];
  revoked: Map<string, AnchorSignedMessage>;
  disputed: Map<string, AnchorSignedMessage[]>;
  warnings: string[];
}

export function resolveRevocations(messages: AnchorSignedMessage[]): Map<string, AnchorSignedMessage> {
  const byFp = new Map(messages.map((message) => [message.fp, message]));
  const revoked = new Map<string, AnchorSignedMessage>();

  for (const message of messages) {
    if (messageType(message.body.payload) !== "revocation") continue;
    const target = payloadString(message.body.payload, "a.rev:target");
    if (!target) continue;
    const targetMessage = byFp.get(target);
    if (targetMessage && targetMessage.body.from === message.body.from) {
      revoked.set(target, message);
    }
  }

  return revoked;
}

export function resolveDisputes(messages: AnchorSignedMessage[]): Map<string, AnchorSignedMessage[]> {
  const disputed = new Map<string, AnchorSignedMessage[]>();
  for (const message of messages) {
    if (messageType(message.body.payload) !== "dispute") continue;
    const target = payloadString(message.body.payload, "a.dis:target");
    const status = payloadString(message.body.payload, "a.dis:status")?.toLowerCase();
    if (!target || status === "resolved" || status === "closed_resolved") continue;
    const entries = disputed.get(target) ?? [];
    entries.push(message);
    disputed.set(target, entries);
  }
  return disputed;
}

export function resolveActiveMessages(messages: AnchorSignedMessage[]): MessageResolution {
  const revoked = resolveRevocations(messages);
  const disputed = resolveDisputes(messages);
  const warnings: string[] = [];

  for (const message of messages) {
    if (messageType(message.body.payload) !== "revocation") continue;
    const target = payloadString(message.body.payload, "a.rev:target");
    if (target && !revoked.has(target)) {
      warnings.push(`Revocation ${message.fp} cannot revoke target ${target}`);
    }
  }

  return {
    activeMessages: messages.filter((message) => !revoked.has(message.fp)),
    revoked,
    disputed,
    warnings,
  };
}
