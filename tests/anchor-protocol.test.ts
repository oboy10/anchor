import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeMessageBody,
  canonicalizePayload,
  createDemoPresentationBundle,
  deterministicIdentity,
  encryptWalletEnvelope,
  decryptWalletEnvelope,
  rekeyWalletEnvelope,
  signTypedMessage,
  verifyMessage,
  verifyPresentationBundle,
  verifySignerChain,
  type AnchorPayloadEntry,
  type AnchorSignedMessage,
} from "../lib/anchor/protocol";

test("canonical serialization preserves duplicate payload keys and sorted nested keys", () => {
  const payload: AnchorPayloadEntry[] = [
    { k: "a:type", v: "identity" },
    { k: "a:ts", v: "2026-01-01T00:00:00.000Z" },
    { k: "a.id:method", v: "document" },
    { k: "dup", v: "first" },
    { k: "dup", v: { z: 1, a: true } },
  ];

  assert.equal(
    canonicalizePayload(payload),
    '[["a:type","identity"],["a:ts","2026-01-01T00:00:00.000Z"],["a.id:method","document"],["dup","first"],["dup",{"a":true,"z":1}]]',
  );

  const canonical = canonicalizeMessageBody({
    v: 1,
    from: "aaaaaaaaaaaaaaaa",
    to: "bbbbbbbbbbbbbbbb",
    nonce: "cccccccccccccccccccccc",
    payload,
  });
  assert.match(canonical, /^{"v":1,"from":"aaaaaaaaaaaaaaaa","to":"bbbbbbbbbbbbbbbb","nonce":/);
});

test("canonical serialization rejects floats", () => {
  assert.throws(
    () =>
      canonicalizePayload([
        { k: "a:type", v: "identity" },
        { k: "a:ts", v: "2026-01-01T00:00:00.000Z" },
        { k: "a.id:method", v: "document" },
        { k: "bad", v: 1.5 },
      ]),
    /Only safe integer/,
  );
});

test("identity fingerprints are deterministic and signatures verify over canonical bodies", () => {
  const issuer = deterministicIdentity("issuer:test", "org", "Issuer");
  const subject = deterministicIdentity("subject:test", "person", "Subject");
  const message = signTypedMessage({
    from: issuer.identity.fingerprint,
    to: subject.identity.fingerprint,
    signerPrivateKey: issuer.privateKey,
    nonce: "FFFFFFFFFFFFFFFFFFFFFF",
    payload: [
      { k: "a:type", v: "identity" },
      { k: "a:ts", v: "2026-01-01T00:00:00.000Z" },
      { k: "a.id:method", v: "document_review" },
    ],
  });

  assert.equal(issuer.identity.fingerprint.length, 16);
  assert.equal(verifyMessage(message).valid, true);

  const tampered: AnchorSignedMessage = {
    ...message,
    body: {
      ...message.body,
      payload: [...message.body.payload, { k: "a.id:email", v: "changed@example.test" }],
    },
  };
  assert.equal(verifyMessage(tampered).valid, false);
});

test("signer chain classifier handles healthy, orphaned, forked, and cyclic states", () => {
  const issuer = deterministicIdentity("issuer:chain", "person", "Chain Issuer");
  const subject = deterministicIdentity("subject:chain", "person", "Chain Subject");
  const first = signTypedMessage({
    from: issuer.identity.fingerprint,
    to: subject.identity.fingerprint,
    signerPrivateKey: issuer.privateKey,
    nonce: "GGGGGGGGGGGGGGGGGGGGGG",
    payload: referencePayload("2026-01-01T00:00:00.000Z", "landlord", "Root reference"),
  });
  const second = signTypedMessage({
    from: issuer.identity.fingerprint,
    to: subject.identity.fingerprint,
    signerPrivateKey: issuer.privateKey,
    previous: first,
    nonce: "HHHHHHHHHHHHHHHHHHHHHH",
    payload: referencePayload("2026-01-02T00:00:00.000Z", "landlord", "Follow-up reference"),
  });
  const fork = signTypedMessage({
    from: issuer.identity.fingerprint,
    to: subject.identity.fingerprint,
    signerPrivateKey: issuer.privateKey,
    previous: first,
    nonce: "IIIIIIIIIIIIIIIIIIIIII",
    payload: referencePayload("2026-01-03T00:00:00.000Z", "landlord", "Forked reference"),
  });

  assert.equal(verifySignerChain([first, second]).status, "healthy");
  assert.equal(verifySignerChain([second]).status, "orphaned");
  assert.equal(verifySignerChain([second], { partialContext: true }).status, "partial");
  assert.equal(verifySignerChain([first, second, fork]).status, "forked");

  const cyclic = [
    fakeMessage(issuer.identity.fingerprint, "one", "two"),
    fakeMessage(issuer.identity.fingerprint, "two", "one"),
  ];
  assert.equal(verifySignerChain(cyclic, { skipSignatureVerification: true }).status, "cyclic");
});

test("presentation verification computes seven metric cards without a composite score", () => {
  const bundle = createDemoPresentationBundle();
  const result = verifyPresentationBundle(bundle, {
    identities: bundle.relatedKeys,
    verifierConfirmedServices: [bundle.subject.fingerprint],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(Object.keys(result.trustSummary.metrics), [
    "identityAssurance",
    "evidenceStrength",
    "housingReliability",
    "referenceStrength",
    "recommenderCredibility",
    "chainIntegrity",
    "freshnessAndStanding",
  ]);
  assert.equal(result.trustSummary.metrics.chainIntegrity.score, 100);
  assert.ok(result.trustSummary.metrics.recommenderCredibility.score > 0);
});

test("wallet envelope encrypts, decrypts, and rekeys authenticated wallet data", async () => {
  const bundle = createDemoPresentationBundle();
  const wallet = { messages: bundle.messages, metadata: { label: "demo" } };
  const envelope = await encryptWalletEnvelope(wallet, "correct horse battery staple");
  assert.notEqual(envelope.ciphertext, "");

  await assert.rejects(
    () => decryptWalletEnvelope(envelope, "wrong password"),
    /Unsupported state|bad decrypt|authenticate/i,
  );

  const decrypted = await decryptWalletEnvelope(envelope, "correct horse battery staple");
  assert.equal(decrypted.messages?.length, bundle.messages.length);

  const rekeyed = await rekeyWalletEnvelope(
    envelope,
    "correct horse battery staple",
    "new correct horse battery staple",
  );
  const rekeyedPlaintext = await decryptWalletEnvelope(
    rekeyed,
    "new correct horse battery staple",
  );
  assert.equal(rekeyedPlaintext.metadata?.label, "demo");
});

function referencePayload(
  timestamp: string,
  relationship: string,
  claim: string,
): AnchorPayloadEntry[] {
  return [
    { k: "a:type", v: "reference" },
    { k: "a:ts", v: timestamp },
    { k: "a.ref:relationship", v: relationship },
    { k: "a.ref:claim", v: claim },
  ];
}

function fakeMessage(signer: string, fp: string, prev: string): AnchorSignedMessage {
  return {
    fp,
    signerPk: "",
    sig: "",
    body: {
      v: 1,
      from: signer,
      to: "subject",
      nonce: fp,
      payload: [
        { k: "a:type", v: "reference" },
        { k: "a:ts", v: "2026-01-01T00:00:00.000Z" },
        { k: "a.ref:relationship", v: "peer" },
        { k: "a.ref:claim", v: "Claim" },
        { k: "a.ch:prev", v: prev },
      ],
    },
  };
}
