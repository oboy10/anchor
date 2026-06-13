import assert from "node:assert/strict";
import { createPacketAction } from "../app/actions";
import { getLedger, listPacketsForResident, reseed } from "../lib/data";
import { setResendClientFactoryForTesting } from "../lib/email/share-packet";
import { setTwilioClientFactoryForTesting } from "../lib/sms/twilio";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

async function packetInput(overrides: Partial<Parameters<typeof createPacketAction>[0]> = {}) {
  const credentials = await getLedger("r_marcus");
  const credential = credentials[0];
  if (!credential) throw new Error("Expected seeded credential.");

  return {
    residentId: "r_marcus",
    label: "Integration test packet",
    purpose: "housing" as const,
    includedCredentialIds: [credential.id],
    sharedNoteCredentialIds: [],
    intro: undefined,
    expiresInDays: 14,
    ...overrides,
  };
}

async function main() {
  const env = {
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
    googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    resendApiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioMessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  };

  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.FIREBASE_CLIENT_EMAIL;
  delete process.env.FIREBASE_PRIVATE_KEY;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  process.env.NEXT_PUBLIC_APP_URL = "https://anchor.example.test";

  try {
    await reseed();

    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM = "Anchor <hello@example.test>";
    const sentEmails: unknown[] = [];
    setResendClientFactoryForTesting(() => ({
      emails: {
        async send(input) {
          sentEmails.push(input);
          return { error: null };
        },
      },
    }));

    const emailResult = await createPacketAction(
      await packetInput({
        deliveryMethod: "email",
        reviewerEmail: "reviewer@example.test",
      }),
    );
    assert.equal(emailResult.ok, true);
    assert.equal(emailResult.emailSent, true);
    assert.equal(emailResult.reviewerEmail, "reviewer@example.test");
    assert.equal(sentEmails.length, 1);

    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "token_test";
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_test";
    const sentSms: unknown[] = [];
    setTwilioClientFactoryForTesting(() => ({
      messages: {
        async create(input) {
          sentSms.push(input);
        },
      },
    }));

    const smsResult = await createPacketAction(
      await packetInput({
        deliveryMethod: "sms",
        reviewerPhone: "(415) 555-2671",
      }),
    );
    assert.equal(smsResult.ok, true);
    assert.equal(smsResult.smsSent, true);
    assert.equal(smsResult.reviewerPhone, "+14155552671");
    assert.equal(sentSms.length, 1);

    const beforeInvalid = await listPacketsForResident("r_marcus");
    const invalidResult = await createPacketAction(
      await packetInput({
        deliveryMethod: "sms",
        reviewerPhone: "555-2671",
      }),
    );
    assert.equal(invalidResult.ok, false);
    const afterInvalid = await listPacketsForResident("r_marcus");
    assert.equal(afterInvalid.length, beforeInvalid.length);

    delete process.env.TWILIO_ACCOUNT_SID;
    const beforeMissingEnv = await listPacketsForResident("r_marcus");
    const missingEnvResult = await createPacketAction(
      await packetInput({
        deliveryMethod: "sms",
        reviewerPhone: "+14155552672",
      }),
    );
    assert.equal(missingEnvResult.ok, true);
    assert.equal(missingEnvResult.smsSent, false);
    assert.match(missingEnvResult.smsError ?? "", /TWILIO_ACCOUNT_SID/);
    const afterMissingEnv = await listPacketsForResident("r_marcus");
    assert.equal(afterMissingEnv.length, beforeMissingEnv.length + 1);
  } finally {
    setResendClientFactoryForTesting(undefined);
    setTwilioClientFactoryForTesting(undefined);
    restoreEnv("FIREBASE_PROJECT_ID", env.firebaseProjectId);
    restoreEnv("FIREBASE_CLIENT_EMAIL", env.firebaseClientEmail);
    restoreEnv("FIREBASE_PRIVATE_KEY", env.firebasePrivateKey);
    restoreEnv("GOOGLE_APPLICATION_CREDENTIALS", env.googleApplicationCredentials);
    restoreEnv("RESEND_API_KEY", env.resendApiKey);
    restoreEnv("RESEND_FROM", env.resendFrom);
    restoreEnv("TWILIO_ACCOUNT_SID", env.twilioAccountSid);
    restoreEnv("TWILIO_AUTH_TOKEN", env.twilioAuthToken);
    restoreEnv("TWILIO_MESSAGING_SERVICE_SID", env.twilioMessagingServiceSid);
    restoreEnv("NEXT_PUBLIC_APP_URL", env.appUrl);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
