import type {
  AttestationRequestView,
  IssuedMessageView,
  IssuerDirectoryEntry,
  PublicAnchorContext,
} from "./types";

interface AnchorStore {
  identities: Map<string, IssuerDirectoryEntry>;
  requests: Map<string, AttestationRequestView>;
  issuedMessages: Map<string, IssuedMessageView>;
  cachedChainHeads: PublicAnchorContext["cachedChainHeads"];
}

const GLOBAL_KEY = "__anchor_workflow_store__";
type GlobalWithAnchorStore = typeof globalThis & { [GLOBAL_KEY]?: AnchorStore };

function emptyStore(): AnchorStore {
  return {
    identities: new Map(),
    requests: new Map(),
    issuedMessages: new Map(),
    cachedChainHeads: [],
  };
}

function store(): AnchorStore {
  const g = globalThis as GlobalWithAnchorStore;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = emptyStore();
  return g[GLOBAL_KEY]!;
}

export function resetAnchorRepository(): void {
  (globalThis as GlobalWithAnchorStore)[GLOBAL_KEY] = emptyStore();
}

export function upsertIdentity(entry: IssuerDirectoryEntry): {
  entry: IssuerDirectoryEntry;
  created: boolean;
} {
  const s = store();
  const existing = s.identities.get(entry.fingerprint);
  if (existing?.publicKey === entry.publicKey) {
    return { entry: existing, created: false };
  }
  s.identities.set(entry.fingerprint, entry);
  return { entry, created: !existing };
}

export function getIdentity(fingerprint: string): IssuerDirectoryEntry | undefined {
  return store().identities.get(fingerprint);
}

export function listIdentities(): IssuerDirectoryEntry[] {
  return [...store().identities.values()].sort((a, b) =>
    (a.displayLabel ?? a.fingerprint).localeCompare(b.displayLabel ?? b.fingerprint),
  );
}

export function createAttestationRequest(
  request: AttestationRequestView,
): AttestationRequestView {
  store().requests.set(request.id, request);
  return request;
}

export function updateAttestationRequest(
  id: string,
  update: Partial<AttestationRequestView>,
): AttestationRequestView | undefined {
  const existing = store().requests.get(id);
  if (!existing) return undefined;
  const next = { ...existing, ...update, id, updatedAt: new Date().toISOString() };
  store().requests.set(id, next);
  return next;
}

export function getAttestationRequest(id: string): AttestationRequestView | undefined {
  return store().requests.get(id);
}

export function listAttestationRequests(filter?: {
  subjectFingerprint?: string;
  issuerFingerprint?: string;
}): AttestationRequestView[] {
  return [...store().requests.values()]
    .filter((request) =>
      filter?.subjectFingerprint
        ? request.subjectFingerprint === filter.subjectFingerprint
        : true,
    )
    .filter((request) =>
      filter?.issuerFingerprint
        ? request.issuerFingerprint === filter.issuerFingerprint
        : true,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveIssuedMessage(message: IssuedMessageView): IssuedMessageView {
  store().issuedMessages.set(message.id, message);
  if (message.demoConsented) {
    const heads = store().cachedChainHeads.filter(
      (head) => head.signerFingerprint !== message.issuerFingerprint,
    );
    heads.push({
      signerFingerprint: message.issuerFingerprint,
      messageFingerprint: message.messageFingerprint,
    });
    store().cachedChainHeads = heads;
  }
  return message;
}

export function listIssuedMessages(): IssuedMessageView[] {
  return [...store().issuedMessages.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getPublicAnchorContext(): PublicAnchorContext {
  const s = store();
  const identities = listIdentities();
  return {
    issuers: identities.filter((identity) => identity.entityType !== "person"),
    identities,
    cachedChainHeads: [...s.cachedChainHeads],
  };
}
