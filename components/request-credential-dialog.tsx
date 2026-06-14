"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { useAuth } from "./auth-provider";
import { requestCredentialAction } from "@/lib/local/actions";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { FormField, TextAreaField } from "./ui/field";
import { InlineNotice } from "./ui/inline-notice";

export function RequestCredentialDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { active } = useAuth();
  const [issuerEmail, setIssuerEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  function reset() {
    setIssuerEmail("");
    setMessage("");
    setError(null);
    setSuccess(null);
    setPending(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await requestCredentialAction({
      issuerEmail,
      requesterName: active?.label ?? "",
      message: message.trim() || undefined,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(
      `Request sent to ${issuerEmail.trim()}. When they sign, the credential will appear here automatically.`,
    );
  }

  const needsEmail = !active?.verifiedEmail;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Request a credential"
      description="Enter the email of a landlord, employer, or caseworker. They'll get a link to sign — it lands in your wallet when they're done."
      footer={
        success
          ? (
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          )
          : (
            <>
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={pending || needsEmail || !issuerEmail.trim()}
                onClick={handleSubmit}
              >
                <Send className="size-4" aria-hidden />
                {pending ? "Sending…" : "Send request"}
              </Button>
            </>
          )
      }
    >
      {needsEmail ? (
        <InlineNotice tone="warning" title="Verify your email first">
          Organizations send credentials back to your verified email. Add and verify it on Edit
          profile before requesting.
        </InlineNotice>
      ) : null}
      {success ? (
        <InlineNotice tone="calm" title="Request sent">
          {success}
        </InlineNotice>
      ) : (
        <div className="space-y-4">
          <FormField
            label="Their email"
            type="email"
            hint="Landlord, employer, caseworker, or anyone who can attest to your record."
            value={issuerEmail}
            onChange={(e) => setIssuerEmail(e.target.value)}
            placeholder="contact@organization.org"
            required
          />
          <TextAreaField
            label="Note (optional)"
            hint="What you're asking for — e.g. “12 months of on-time rent payments.”"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      )}
    </Dialog>
  );
}
