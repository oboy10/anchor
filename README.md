# TrustWallet

A resident-controlled verified reputation wallet. Shelters, landlords, employers, and caseworkers issue **signed Ed25519 attestations**. Residents choose what to share via time-limited packets.

## Quick start

```bash
npm install
cp .env.example .env.local   # add Firebase values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Firebase setup

### 1. Client config (browser)

Add to `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 2. Admin config (server / Firestore)

From Firebase Console → Project settings → Service accounts → **Generate new private key**:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@....iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Or set `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json` for local dev.

When Admin credentials are present, the app **persists to Firestore** and auto-seeds demo data on first request.

Without Admin credentials, the app runs on an **in-memory demo store** (no Firebase required).

### 3. Deploy Firestore rules & indexes

```bash
npm install -g firebase-tools
firebase login
firebase use anchor-8bdff   # your project id
firebase deploy --only firestore:rules,firestore:indexes
```

Rules live in `firestore.rules`. See that file for the security model.

## Firestore collections

| Collection | Purpose |
|---|---|
| `users/{fingerprint}` | Public Ed25519 keys + role |
| `slugs/{slug}` | URL slug → fingerprint |
| `residents/{fingerprint}` | Resident profile |
| `providers/{fingerprint}` | Provider profile |
| `attestations/{nonce}` | Signed credential records |
| `residentNotes/{id}` | Resident-owned notes (unsigned) |
| `sharePackets/{token}` | Time-limited share links |
| `endorsements/{id}` | Endorsements |
| `meta/demoSeed` | Seed marker |

## Routes

| Route | Description |
|---|---|
| `/` | Landing |
| `/demo` | Role selector |
| `/resident/r_marcus` | Resident wallet |
| `/provider` | Issue credentials |
| `/verify/demo-maple-street` | Public verification |
| `/admin` | Seed + inspect ledger |

## Deploy on Vercel

1. Import repo from GitHub
2. Add all `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_*` env vars
3. Deploy — Firestore backend activates automatically when Admin vars are set

## Crypto model

- **Identity:** Ed25519 keypair; fingerprint = `SHA-512(public_key)[0:8]`
- **Record:** Signed attestation `{ from, to, properties, nonce }` + Ed25519 signature
- Provider private keys for signing: `TRUSTWALLET_PROVIDER_KEYS` env (JSON) or demo keys in dev

Private keys are **never** stored in Firestore.
