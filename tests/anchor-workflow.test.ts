import assert from "node:assert/strict";
import { POST as seedDemo } from "../app/api/anchor/demo/seed/route";
import {
  GET as listIdentities,
  POST as postIdentity,
} from "../app/api/anchor/identities/route";
import {
  GET as listRequests,
  POST as postRequest,
} from "../app/api/anchor/attestation-requests/route";
import { POST as postIssuance } from "../app/api/anchor/issuance/route";
import { POST as postPrepare } from "../app/api/anchor/presentations/prepare/route";
import { POST as postVerify } from "../app/api/anchor/presentations/verify/route";
import { GET as getContext } from "../app/api/anchor/context/route";
import { anchorProtocolAdapter } from "../lib/anchor/protocol-adapter";
import {
  registerAnchorIdentity,
  verifyAnchorPresentation,
} from "../lib/anchor/service";
import { setTwilioClientFactoryForTesting } from "../lib/sms/twilio";
import {
  anchorDemoIdentities,
  signAnchorDemoIntent,
} from "../lib/anchor/demo";
import type {
  AnchorProtocolAdapter,
  DemoSeedDescriptor,
  PresentationVerifyResponse,
  TrustSummaryView,
} from "../lib/anchor/types";

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

async function main() {
  const seedResponse = await seedDemo();
  assert.equal(seedResponse.status, 201);
  const descriptor = await json<DemoSeedDescriptor>(seedResponse);
  assert.equal(descriptor.presentationBundle.messages.length >= 4, true);
  assert.equal(descriptor.requestIds.length, 2);

  const identitiesResponse = await listIdentities(
    new Request("http://localhost/api/anchor/identities?role=issuer"),
  );
  const identitiesBody = await json<{ identities: unknown[] }>(identitiesResponse);
  assert.equal(identitiesResponse.status, 200);
  assert.equal(identitiesBody.identities.length >= 4, true);

  const duplicateIdentityResponse = await postIdentity(
    jsonRequest("http://localhost/api/anchor/identities", {
      identity: anchorDemoIdentities.subject,
      displayLabel: "Marcus R.",
    }),
  );
  const duplicateIdentityBody = await json<{ created: boolean }>(
    duplicateIdentityResponse,
  );
  assert.equal(duplicateIdentityResponse.status, 200);
  assert.equal(duplicateIdentityBody.created, false);

  let adapterRejectedMismatch = false;
  const rejectingAdapter: AnchorProtocolAdapter = {
    ...anchorProtocolAdapter,
    async registerPublicIdentity() {
      adapterRejectedMismatch = true;
      return {
        valid: false,
        errors: ["fingerprint/public key mismatch"],
      };
    },
  };
  await assert.rejects(
    () =>
      registerAnchorIdentity(
        {
          identity: {
            ...anchorDemoIdentities.subject,
            fingerprint: "ffffffffffffffff",
          },
        },
        rejectingAdapter,
    ),
    /fingerprint\/public key mismatch/,
  );
  assert.equal(adapterRejectedMismatch, true);

  const signedReference = signAnchorDemoIntent({
    issuerFingerprint: anchorDemoIdentities.formerLandlord.fingerprint,
    subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
    type: "reference",
    payload: [
      { k: "a.ref:relationship", v: "former landlord" },
      { k: "a.ref:claim", v: "Would rent to again." },
    ],
  });

  const createRequestResponse = await postRequest(
    jsonRequest("http://localhost/api/anchor/attestation-requests", {
      subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
      issuerFingerprint: anchorDemoIdentities.formerLandlord.fingerprint,
      requestedType: "reference",
      requestedFields: ["a.ref:relationship", "a.ref:claim"],
      note: "Integration test reference request.",
    }),
  );
  const createRequestBody = await json<{ request: { id: string; status: string } }>(
    createRequestResponse,
  );
  assert.equal(createRequestResponse.status, 201);
  assert.equal(createRequestBody.request.status, "pending");

  const twilioEnv = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  };
  process.env.TWILIO_ACCOUNT_SID = "AC_test";
  process.env.TWILIO_AUTH_TOKEN = "token_test";
  process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_test";
  process.env.NEXT_PUBLIC_APP_URL = "https://anchor.example.test";

  const sentSms: unknown[] = [];
  setTwilioClientFactoryForTesting(() => ({
    messages: {
      async create(input) {
        sentSms.push(input);
      },
    },
  }));

  const smsRequestResponse = await postRequest(
    jsonRequest("http://localhost/api/anchor/attestation-requests", {
      subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
      deliveryMethod: "sms",
      recipientPhone: "(415) 555-2671",
      requestedType: "reference",
      requestedFields: ["a.ref:relationship"],
      note: "SMS request test.",
    }),
  );
  const smsRequestBody = await json<{
    request: {
      id: string;
      status: string;
      externalContact?: { type: string; url: string };
      recipientPhone?: string;
    };
    smsSent: boolean;
    smsError?: string;
    recipientPhone?: string;
  }>(smsRequestResponse);
  assert.equal(smsRequestResponse.status, 201);
  assert.equal(smsRequestBody.smsSent, true);
  assert.equal(smsRequestBody.smsError, undefined);
  assert.equal(smsRequestBody.recipientPhone, "+14155552671");
  assert.deepEqual(smsRequestBody.request.externalContact, {
    type: "phone",
    url: "tel:+14155552671",
  });
  assert.equal(smsRequestBody.request.recipientPhone, undefined);
  assert.equal(sentSms.length, 1);

  delete process.env.TWILIO_ACCOUNT_SID;
  const failedSmsRequestResponse = await postRequest(
    jsonRequest("http://localhost/api/anchor/attestation-requests", {
      subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
      deliveryMethod: "sms",
      recipientPhone: "+14155552672",
      requestedType: "reference",
      requestedFields: ["a.ref:relationship"],
      note: "SMS failure should still persist.",
    }),
  );
  const failedSmsRequestBody = await json<{
    request: { id: string; status: string };
    smsSent: boolean;
    smsError?: string;
  }>(failedSmsRequestResponse);
  assert.equal(failedSmsRequestResponse.status, 201);
  assert.equal(failedSmsRequestBody.request.status, "pending");
  assert.equal(failedSmsRequestBody.smsSent, false);
  assert.match(failedSmsRequestBody.smsError ?? "", /TWILIO_ACCOUNT_SID/);

  setTwilioClientFactoryForTesting(undefined);
  restoreEnv("TWILIO_ACCOUNT_SID", twilioEnv.accountSid);
  restoreEnv("TWILIO_AUTH_TOKEN", twilioEnv.authToken);
  restoreEnv("TWILIO_MESSAGING_SERVICE_SID", twilioEnv.messagingServiceSid);
  restoreEnv("NEXT_PUBLIC_APP_URL", twilioEnv.appUrl);

  const listRequestsResponse = await listRequests(
    new Request(
      `http://localhost/api/anchor/attestation-requests?subject=${anchorDemoIdentities.subject.fingerprint}`,
    ),
  );
  const listRequestsBody = await json<{ requests: unknown[] }>(listRequestsResponse);
  assert.equal(listRequestsResponse.status, 200);
  assert.equal(listRequestsBody.requests.length >= 3, true);

  const issuanceResponse = await postIssuance(
    jsonRequest("http://localhost/api/anchor/issuance", {
      requestId: createRequestBody.request.id,
      issuerFingerprint: anchorDemoIdentities.formerLandlord.fingerprint,
      subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
      type: "reference",
      persistDemoCopy: true,
      signedMessage: signedReference,
    }),
  );
  const issuanceBody = await json<{
    issuedMessage: { signedMessage: NonNullable<unknown>; messageFingerprint: string };
  }>(issuanceResponse);
  assert.equal(issuanceResponse.status, 201);
  assert.match(issuanceBody.issuedMessage.messageFingerprint, /^[0-9a-f]{16}$/);

  const prepareResponse = await postPrepare(
    jsonRequest("http://localhost/api/anchor/presentations/prepare", {
      purpose: "housing_application",
      subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
      messages: descriptor.presentationBundle.messages,
      relatedKeys: [anchorDemoIdentities.formerLandlord],
      note: "Integration test bundle.",
    }),
  );
  const prepareBody = await json<{ bundle: DemoSeedDescriptor["presentationBundle"] }>(
    prepareResponse,
  );
  assert.equal(prepareResponse.status, 201);
  assert.equal(prepareBody.bundle.subject.fingerprint, anchorDemoIdentities.subject.fingerprint);

  const verifyResponse = await postVerify(
    jsonRequest("http://localhost/api/anchor/presentations/verify", {
      bundle: prepareBody.bundle,
    }),
  );
  const verifyBody = await json<PresentationVerifyResponse>(verifyResponse);
  assert.equal(verifyResponse.status, 200);
  assert.equal(verifyBody.valid, true);
  assert.deepEqual(Object.keys(verifyBody.trustSummary.metrics).sort(), [
    "chainIntegrity",
    "evidenceStrength",
    "freshnessAndStanding",
    "housingReliability",
    "identityAssurance",
    "recommenderCredibility",
    "referenceStrength",
  ]);

  let verifyForwarded = false;
  let summaryForwarded = false;
  const forwardingAdapter: AnchorProtocolAdapter = {
    ...anchorProtocolAdapter,
    async verifyPresentationBundle() {
      verifyForwarded = true;
      return {
        valid: true,
        checks: [{ name: "mock-verifier", ok: true }],
        signerChainStates: { [anchorDemoIdentities.formerLandlord.fingerprint]: "healthy" },
        flags: [],
      };
    },
    async computeTrustSummary() {
      summaryForwarded = true;
      const base = await anchorProtocolAdapter.computeTrustSummary(
        prepareBody.bundle,
        {
          issuers: [],
          identities: [],
          organizationRelationships: [],
          cachedChainHeads: [],
          demoOutcomes: [],
        },
      );
      return base satisfies TrustSummaryView;
    },
  };
  await verifyAnchorPresentation({ bundle: prepareBody.bundle }, forwardingAdapter);
  assert.equal(verifyForwarded, true);
  assert.equal(summaryForwarded, true);

  const contextResponse = await getContext();
  const contextBody = await json<{ issuers: unknown[]; demoOutcomes: unknown[] }>(
    contextResponse,
  );
  assert.equal(contextResponse.status, 200);
  assert.equal(contextBody.issuers.length >= 4, true);
  assert.equal(contextBody.demoOutcomes.length >= 2, true);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
