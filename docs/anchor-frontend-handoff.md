# Anchor Frontend Handoff

Agent A added public-metadata and workflow APIs under `/api/anchor/*`. The backend is intentionally not a wallet: private keys, passphrases, encrypted wallet blobs, and complete user-held trust histories stay client-side.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/anchor/identities` | Register a public Ed25519 identity. Idempotent for the same fingerprint/public key. |
| `GET` | `/api/anchor/identities` | List known public identities. Add `?role=issuer` for non-person issuer entries. |
| `GET` | `/api/anchor/identities/[fingerprint]` | Resolve one public identity. |
| `POST` | `/api/anchor/attestation-requests` | Create off-chain workflow metadata for an attestation request. |
| `GET` | `/api/anchor/attestation-requests?subject=...&issuer=...` | List workflow requests by subject and/or issuer. |
| `GET` | `/api/anchor/attestation-requests/[id]` | View one workflow request. |
| `PATCH` | `/api/anchor/attestation-requests/[id]` | Update request status: `pending`, `fulfilled`, `rejected`, or `expired`. |
| `POST` | `/api/anchor/issuance` | Submit a wallet/issuer-signed message; backend validates directory state and verifies the signature through the protocol adapter. |
| `POST` | `/api/anchor/presentations/prepare` | Normalize selected client-held messages into an `AnchorPresentationBundle`. |
| `POST` | `/api/anchor/presentations/verify` | Delegate presentation verification and trust summary computation to the protocol adapter. |
| `GET` | `/api/anchor/context` | Return public context: issuer directory, known identities, org relationships, chain-head cache, demo outcomes. |
| `POST` | `/api/anchor/demo/seed` | Seed deterministic demo workflow data and return a ready housing presentation bundle. |

## Main DTOs

Types live in `lib/anchor/types.ts`.

Use these for forms and API clients:

```ts
IdentityRegistrationRequest
AttestationRequestCreate
IssuanceIntent
PresentationPrepareRequest
PresentationVerifyRequest
PresentationVerifyResponse
TrustSummaryView
IssuerDirectoryEntry
DemoSeedDescriptor
```

`PresentationVerifyResponse.trustSummary.metrics` contains exactly seven metric cards:

```ts
identityAssurance
evidenceStrength
housingReliability
referenceStrength
recommenderCredibility
chainIntegrity
freshnessAndStanding
```

Each card has:

```ts
{
  score: number;
  band: "low" | "developing" | "solid" | "strong";
  reasons: string[];
  flags: string[];
}
```

## Privacy Assumptions

Public-metadata endpoints may store public keys, fingerprints, display labels, service endpoints, organization metadata, request/session metadata, public context, and demo-consented signed messages.

Wallet material must remain client-side:

```text
private keys
passphrases
plaintext wallet blobs
complete user-held attestation history
non-demo signed messages unless explicitly shared by the user
```

If browser persistence is added, use Agent B's wallet envelope and encrypted IndexedDB storage. Do not use plaintext `localStorage` for sensitive data.

## Protocol Adapter Boundary

`lib/anchor/protocol-adapter.ts` wraps Agent B's real `@/lib/anchor/protocol` package. Fingerprint validation, message verification, presentation verification, chain state, and trust-summary output are protocol-owned.

Issuance is a client/issuer signing flow: the frontend should send `IssuanceIntent.signedMessage` to `/api/anchor/issuance`. The backend does not accept user private keys for normal issuance.
