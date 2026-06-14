# Anchor

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

When Admin credentials are present, the server can store **hashed** email/phone registries in Firestore (see collections below).

Without Admin credentials, verification and email registry fall back to in-memory mode for local dev.

### 3. Optional email and SMS delivery

Share packets work as copyable links without provider credentials. To send packet
links by email, configure Resend:

```bash
RESEND_API_KEY=
RESEND_FROM=Anchor <hello@yourdomain.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

To send packet links and Anchor attestation requests by SMS, configure Twilio
with a Messaging Service:

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
```

### 4. Deploy Firestore rules & indexes

```bash
npm install -g firebase-tools
firebase login
firebase use anchor-8bdff   # your project id
firebase deploy --only firestore:rules,firestore:indexes
```

Rules live in `firestore.rules`. See that file for the security model.

## Firestore collections

The app is **local-first** — wallet data lives in the browser. Firestore only holds hashed identifiers (no plaintext PII):

| Collection | Purpose |
|---|---|
| `registeredEmails/{hash}` | SHA-256 of registered emails (future encrypted backup lookup) |
| `pendingVerifications/{hash}` | Short-lived verification codes (hashed), auto-expire |
| `registeredIdentities/{hash}` | SHA-256 of verified email/phone (prevent double registration) |

Legacy collections from earlier builds (`users`, `attestations`, `sharePackets`, etc.) are unused. Remove with:

```bash
npm run firebase:cleanup
```

## Routes

| Route | Description |
|---|---|
| `/` | Landing |
| `/sign-in` | Create or unlock a local account |
| `/wallet` | Resident wallet |
| `/accounts` | Manage accounts (create, rename, export, import, delete) |
| `/provider` | Issue credentials |
| `/verify` | Public verification (opens a resident's share link) |
| `/admin` | Seed + inspect ledger |

## Deploy on Vercel

Production: [milpitas-hacks-red.vercel.app](https://milpitas-hacks-red.vercel.app)

1. Import repo from GitHub
2. Add environment variables (Project → Settings → Environment Variables):

| Variable | Notes |
|---|---|
| All `NEXT_PUBLIC_FIREBASE_*` | From Firebase Console |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Service account — enables Firestore |
| `RESEND_API_KEY` | From [Resend](https://resend.com/api-keys) — share packet emails |
| `RESEND_FROM` | e.g. `Anchor <hello@yourdomain.com>` — must use a [verified domain](https://resend.com/domains) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | From Twilio Console — SMS delivery |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio Messaging Service SID used as the sender |
| `NEXT_PUBLIC_APP_URL` | `https://milpitas-hacks-red.vercel.app` |

Or sync from your local `.env.local` after `vercel login` and `vercel link`:

```bash
npm run vercel:env
vercel --prod
```

3. Redeploy after adding env vars — server actions need them at runtime. Pushing to `main` also triggers a Vercel production deploy.

**Vercel `FIREBASE_PRIVATE_KEY`:** paste the full key from the service account JSON `private_key` field. Either paste it as one line with `\n` between lines (same as `.env.local`), or paste the multiline PEM directly — do not add extra quotes in the Vercel UI.

Without Admin credentials, the app runs on an **in-memory demo store**. Without `RESEND_API_KEY` or Twilio credentials, share packets still work but provider delivery is not sent.

### Resend setup (custom domain)

1. Add your domain at [Resend → Domains](https://resend.com/domains) and add the DNS records they provide
2. Create an API key at [Resend → API Keys](https://resend.com/api-keys)
3. Set `RESEND_FROM=Anchor <hello@yourdomain.com>` using an address on that verified domain
4. Add `RESEND_API_KEY`, `RESEND_FROM`, and `NEXT_PUBLIC_APP_URL` to `.env.local` / Vercel, then redeploy

## Crypto model

- **Identity:** Ed25519 keypair; fingerprint = `SHA-512(public_key)[0:8]`
- **Record:** Signed attestation `{ from, to, properties, nonce }` + Ed25519 signature
- Provider private keys for signing: `ANCHOR_PROVIDER_KEYS` env (JSON) or demo keys in dev

Private keys are **never** stored in Firestore.
