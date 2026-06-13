# Anchor Protocol Module

Agent B owns this framework-agnostic module. Agent A should import protocol behavior from `@/lib/anchor/protocol` instead of reimplementing canonicalization, signing, verification, chain classification, wallet envelopes, or trust-summary computation.

## Crypto Choices

- Identities use Ed25519 public keys encoded as base64url without padding.
- Fingerprints are lowercase hex of `SHA-512(publicKeyRaw)[0:8]`.
- Message signatures are Ed25519 signatures over the canonical message body bytes directly.
- Message fingerprints are lowercase hex of `SHA-512(canonicalBody)[0:8]`.
- Payloads are ordered `{ k, v }` arrays so duplicate top-level keys remain unambiguous.

The implementation intentionally does not pre-hash before signing.

## Wallet Envelope

The target design prefers Argon2id plus XChaCha20-Poly1305 when the repo has a vetted portable dependency. This repo did not have that dependency, and adding a new crypto package would expand the supply-chain surface during the hackathon. The implemented envelope keeps the same high-level contract but uses Node's native memory-hard `scrypt` KDF and authenticated `aes-256-gcm` encryption:

- `alg: "scrypt+aes-256-gcm"`
- random 16-byte salt
- random 12-byte GCM nonce
- 32-byte derived key
- authentication tag stored separately from ciphertext

Do not store plaintext wallet data in `localStorage`; browser persistence should store only this envelope or a future compatible envelope.
