import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  sendSharePacketSms,
  setTwilioClientFactoryForTesting,
} from "../lib/sms/twilio";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test("phone normalization accepts E.164 and common US formats", () => {
  assert.equal(normalizePhoneNumber("+14155552671"), "+14155552671");
  assert.equal(normalizePhoneNumber("(415) 555-2671"), "+14155552671");
  assert.equal(normalizePhoneNumber("1 415 555 2671"), "+14155552671");
  assert.equal(isValidPhoneNumber("+447700900123"), true);
});

test("phone normalization rejects ambiguous or invalid values", () => {
  assert.equal(normalizePhoneNumber("555-2671"), null);
  assert.equal(normalizePhoneNumber("+01234567890"), null);
  assert.equal(normalizePhoneNumber("not a phone"), null);
  assert.equal(isValidPhoneNumber("123"), false);
});

test("SMS send returns a disabled error without Twilio env", async () => {
  const previous = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  };
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_MESSAGING_SERVICE_SID;

  let called = false;
  setTwilioClientFactoryForTesting(() => {
    called = true;
    throw new Error("should not create client");
  });

  try {
    const result = await sendSharePacketSms({
      to: "+14155552671",
      senderName: "Marcus R.",
      packetLabel: "Housing packet",
      verifyUrl: "https://example.test/verify/pk_123",
      expiresInDays: 14,
    });

    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /TWILIO_ACCOUNT_SID/);
    assert.equal(called, false);
  } finally {
    setTwilioClientFactoryForTesting(undefined);
    restoreEnv("TWILIO_ACCOUNT_SID", previous.accountSid);
    restoreEnv("TWILIO_AUTH_TOKEN", previous.authToken);
    restoreEnv("TWILIO_MESSAGING_SERVICE_SID", previous.messagingServiceSid);
  }
});

test("SMS send uses normalized phone number when configured", async () => {
  const previous = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  };
  process.env.TWILIO_ACCOUNT_SID = "AC_test";
  process.env.TWILIO_AUTH_TOKEN = "token_test";
  process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_test";

  const sent: unknown[] = [];
  setTwilioClientFactoryForTesting(() => ({
    messages: {
      async create(input) {
        sent.push(input);
      },
    },
  }));

  try {
    const result = await sendSharePacketSms({
      to: "(415) 555-2671",
      senderName: "Marcus R.",
      packetLabel: "Housing packet",
      verifyUrl: "https://example.test/verify/pk_123",
      expiresInDays: 7,
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(sent, [
      {
        to: "+14155552671",
        messagingServiceSid: "MG_test",
        body: "Marcus R. shared an Anchor verification link: https://example.test/verify/pk_123. Expires in 7 days.",
      },
    ]);
  } finally {
    setTwilioClientFactoryForTesting(undefined);
    restoreEnv("TWILIO_ACCOUNT_SID", previous.accountSid);
    restoreEnv("TWILIO_AUTH_TOKEN", previous.authToken);
    restoreEnv("TWILIO_MESSAGING_SERVICE_SID", previous.messagingServiceSid);
  }
});
