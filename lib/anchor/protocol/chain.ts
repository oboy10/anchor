import { chainPrev } from "./payload";
import { verifyMessage } from "./message";
import type { AnchorSignedMessage, SignerChainState, SignerChainStatus } from "./types";

export function indexMessagesBySigner(
  messages: AnchorSignedMessage[],
): Map<string, AnchorSignedMessage[]> {
  const bySigner = new Map<string, AnchorSignedMessage[]>();
  for (const message of messages) {
    const existing = bySigner.get(message.body.from) ?? [];
    existing.push(message);
    bySigner.set(message.body.from, existing);
  }
  return bySigner;
}

export function classifyChainState(
  messagesForOneSigner: AnchorSignedMessage[],
  options: { partialContext?: boolean; skipSignatureVerification?: boolean } = {},
): SignerChainStatus {
  return verifySignerChain(messagesForOneSigner, options).status;
}

export function verifySignerChain(
  messagesForOneSigner: AnchorSignedMessage[],
  options: { partialContext?: boolean; skipSignatureVerification?: boolean } = {},
): SignerChainState {
  const signer = messagesForOneSigner[0]?.body.from ?? "";
  const flags: string[] = [];
  const messageStates = messagesForOneSigner.map((message) => ({
    fp: message.fp,
    prev: chainPrev(message.body.payload),
    status: "standalone" as SignerChainStatus,
  }));

  if (!options.skipSignatureVerification) {
    const tampered = messagesForOneSigner.some((message) => !verifyMessage(message).valid);
    if (tampered) {
      return mark("tampered", "At least one message failed cryptographic verification");
    }
  }

  if (messagesForOneSigner.some((message) => message.body.from !== signer)) {
    return mark("tampered", "Messages from multiple signers were supplied to one signer chain");
  }

  const byFp = new Map(messagesForOneSigner.map((message) => [message.fp, message]));
  const prevClaims = new Map<string, string[]>();
  for (const state of messageStates) {
    if (!state.prev) continue;
    const claims = prevClaims.get(state.prev) ?? [];
    claims.push(state.fp);
    prevClaims.set(state.prev, claims);
  }

  const forkedPrev = [...prevClaims.entries()].find(([, claims]) => claims.length > 1);
  if (forkedPrev) {
    return mark("forked", `Multiple messages claim previous fingerprint ${forkedPrev[0]}`);
  }

  if (hasCycle(messageStates.map((state) => [state.fp, state.prev] as const))) {
    return mark("cyclic", "Signer chain contains a cycle");
  }

  const missingPrev = messageStates.find((state) => state.prev && !byFp.has(state.prev));
  if (missingPrev) {
    return options.partialContext
      ? mark("partial", `Previous message ${missingPrev.prev} is outside the observed bundle`)
      : mark("orphaned", `Previous message ${missingPrev.prev} is missing`);
  }

  const linked = messageStates.some((state) => state.prev);
  if (!linked) return mark("standalone", "No chain links are present");
  return mark("healthy", "All observed chain links resolve within this signer");

  function mark(status: SignerChainStatus, flag: string): SignerChainState {
    flags.push(flag);
    return {
      signer,
      status,
      messageCount: messagesForOneSigner.length,
      flags,
      messageStates: messageStates.map((state) => ({
        ...state,
        status: state.prev ? status : status === "healthy" ? "healthy" : state.status,
      })),
    };
  }
}

function hasCycle(edges: ReadonlyArray<readonly [string, string | undefined]>): boolean {
  const prevByFp = new Map(edges);
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(fp: string): boolean {
    if (visited.has(fp)) return false;
    if (visiting.has(fp)) return true;
    visiting.add(fp);
    const prev = prevByFp.get(fp);
    if (prev && prevByFp.has(prev) && visit(prev)) return true;
    visiting.delete(fp);
    visited.add(fp);
    return false;
  }

  return edges.some(([fp]) => visit(fp));
}
