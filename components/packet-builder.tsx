"use client";

import * as React from "react";
import { Copy, ExternalLink } from "lucide-react";
import { createPacketAction } from "@/lib/local/actions";
import { buildShareUrl } from "@/lib/local/share-link";
import { CredentialCard } from "./credential-card";
import { Dialog } from "./ui/dialog";
import { FormField, SelectField, TextAreaField } from "./ui/field";
import { InlineNotice } from "./ui/inline-notice";
import { Button } from "./ui/button";
import {
  CREDENTIAL_TYPE_LABELS,
  PACKET_PURPOSE_LABELS,
  type Credential,
  type SharePacket,
} from "@/types";
import { formatDate, formatRelativeExpiry } from "@/lib/format";
import { packetState } from "@/lib/metrics";
import { StatusBadge } from "./ui/status-badge";

export interface PacketBuilderProps {
  residentId: string;
  credentials: Credential[];
  existingPackets: SharePacket[];
  onRevoke: (token: string) => Promise<void>;
}

export function PacketBuilder({
  residentId,
  credentials,
  existingPackets,
  onRevoke,
}: PacketBuilderProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<"select" | "preview" | "done">("select");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [sharedNotes, setSharedNotes] = React.useState<Set<string>>(new Set());
  const [label, setLabel] = React.useState("");
  const [purpose, setPurpose] = React.useState<SharePacket["purpose"]>("housing");
  const [intro, setIntro] = React.useState("");
  const [deliveryMethod, setDeliveryMethod] =
    React.useState<"email" | "sms" | "copy">("email");
  const [reviewerEmail, setReviewerEmail] = React.useState("");
  const [reviewerPhone, setReviewerPhone] = React.useState("");
  const [expiresInDays, setExpiresInDays] = React.useState("14");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [createdToken, setCreatedToken] = React.useState<string | null>(null);
  const [createdShareUrl, setCreatedShareUrl] = React.useState<string>("");
  const [emailSent, setEmailSent] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [sentToEmail, setSentToEmail] = React.useState<string | null>(null);
  const [smsSent, setSmsSent] = React.useState(false);
  const [smsError, setSmsError] = React.useState<string | null>(null);
  const [sentToPhone, setSentToPhone] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const active = credentials.filter((c) => c.status !== "corrected");

  function reset() {
    setStep("select");
    setSelected(new Set());
    setSharedNotes(new Set());
    setLabel("");
    setPurpose("housing");
    setIntro("");
    setDeliveryMethod("email");
    setReviewerEmail("");
    setReviewerPhone("");
    setExpiresInDays("14");
    setError(null);
    setCreatedToken(null);
    setCreatedShareUrl("");
    setEmailSent(false);
    setEmailError(null);
    setSentToEmail(null);
    setSmsSent(false);
    setSmsError(null);
    setSentToPhone(null);
    setCopied(false);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSharedNotes((sn) => {
          const n = new Set(sn);
          n.delete(id);
          return n;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleCreate() {
    setPending(true);
    setError(null);
    const result = await createPacketAction({
      residentId,
      label,
      purpose,
      includedCredentialIds: [...selected],
      sharedNoteCredentialIds: [...sharedNotes],
      intro: intro || undefined,
      expiresInDays: Number(expiresInDays),
      deliveryMethod,
      reviewerEmail: deliveryMethod === "email" ? reviewerEmail.trim() || undefined : undefined,
      reviewerPhone: deliveryMethod === "sms" ? reviewerPhone.trim() || undefined : undefined,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCreatedToken(result.token);
    setCreatedShareUrl(result.shareUrl);
    setEmailSent(result.emailSent);
    setEmailError(result.emailError ?? null);
    setSentToEmail(result.reviewerEmail ?? null);
    setSmsSent(result.smsSent);
    setSmsError(result.smsError ?? null);
    setSentToPhone(result.reviewerPhone ?? null);
    setStep("done");
  }

  const preview = active.filter((c) => selected.has(c.id));
  const shareUrl = createdShareUrl;

  async function openPacket(token: string) {
    const url = await buildShareUrl(token, window.location.origin);
    if (url) window.open(url, "_blank", "noopener");
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Share packets</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Build a time-limited link with only the credentials you choose.
          </p>
        </div>
        <Button type="button" onClick={() => { reset(); setOpen(true); }}>
          Build packet
        </Button>
      </div>

      {existingPackets.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {existingPackets.map((p) => {
            const state = packetState(p);
            return (
              <li
                key={p.token}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3"
              >
                <div>
                  <p className="font-medium text-ink">{p.label}</p>
                  <p className="text-sm text-ink-muted">
                    {p.includedCredentialIds.length} credentials · expires{" "}
                    {formatDate(p.expiresAt)} ({formatRelativeExpiry(p.expiresAt)})
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    tone={
                      state === "active"
                        ? "verified"
                        : state === "revoked"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {state === "active"
                      ? "Active"
                      : state === "revoked"
                        ? "Revoked"
                        : "Expired"}
                  </StatusBadge>
                  {state === "active" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openPacket(p.token)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
                      >
                        Preview
                        <ExternalLink className="size-3.5" aria-hidden />
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRevoke(p.token)}
                      >
                        Revoke
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">
          No active packets yet. When you share with a landlord or employer, it
          will appear here.
        </p>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={
          step === "select"
            ? "Choose credentials to share"
            : step === "preview"
              ? "Preview what they will see"
              : "Packet ready"
        }
        description={
          step === "select"
            ? "Only what you select will appear on the verification page."
            : step === "preview"
              ? "Review the packet and send the link to your reviewer."
              : emailSent
                ? "The verification link was emailed to your reviewer."
                : smsSent
                  ? "The verification link was sent by text message to your reviewer."
                : "Copy the link and send it directly to the person reviewing your application."
        }
        footer={
          step === "select" ? (
            <>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={selected.size === 0}
                onClick={() => setStep("preview")}
              >
                Continue
              </Button>
            </>
          ) : step === "preview" ? (
            <>
              <Button type="button" variant="secondary" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button type="button" disabled={pending} onClick={handleCreate}>
                {pending
                  ? "Creating…"
                  : deliveryMethod === "email"
                    ? "Create & send email"
                    : deliveryMethod === "sms"
                      ? "Create & send text"
                      : "Create packet"}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => setOpen(false)}>
              Done
            </Button>
          )
        }
      >
        {step === "select" ? (
          <div className="space-y-4">
            <InlineNotice tone="calm">
              This is not a score. You choose exactly what to share, and you can
              revoke the link at any time.
            </InlineNotice>
            <ul className="space-y-2">
              {active.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-line bg-surface-sunken/50 p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft/40">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="mt-1 size-4 shrink-0 accent-accent"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium uppercase tracking-wide text-ink-faint">
                        {CREDENTIAL_TYPE_LABELS[c.credentialType]}
                      </span>
                      <span className="block font-medium text-ink">{c.title}</span>
                      <span className="block text-sm text-ink-muted">
                        {c.issuerName}
                      </span>
                      {c.residentNote && selected.has(c.id) ? (
                        <label className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                          <input
                            type="checkbox"
                            checked={sharedNotes.has(c.id)}
                            onChange={(e) => {
                              setSharedNotes((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(c.id);
                                else next.delete(c.id);
                                return next;
                              });
                            }}
                            className="size-3.5 accent-accent"
                          />
                          Include my personal note
                        </label>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {step === "preview" ? (
          <div className="space-y-4">
            <FormField
              label="Packet name"
              hint="For your reference, e.g. “For Maple Street Apartments”"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
            <SelectField
              label="Purpose"
              value={purpose}
              onChange={(e) =>
                setPurpose(e.target.value as SharePacket["purpose"])
              }
              options={Object.entries(PACKET_PURPOSE_LABELS).map(([v, l]) => ({
                value: v,
                label: l,
              }))}
            />
            <SelectField
              label="Link expires in"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              options={[
                { value: "7", label: "7 days" },
                { value: "14", label: "14 days" },
                { value: "30", label: "30 days" },
              ]}
            />
            <SelectField
              label="Delivery"
              value={deliveryMethod}
              onChange={(e) =>
                setDeliveryMethod(e.target.value as "email" | "sms" | "copy")
              }
              options={[
                { value: "email", label: "Email" },
                { value: "sms", label: "Text message" },
                { value: "copy", label: "Copy link" },
              ]}
            />
            {deliveryMethod === "email" ? (
              <FormField
                label="Reviewer email"
                hint="We'll email them the verification link."
                type="email"
                autoComplete="email"
                value={reviewerEmail}
                onChange={(e) => setReviewerEmail(e.target.value)}
              />
            ) : null}
            {deliveryMethod === "sms" ? (
              <FormField
                label="Reviewer phone"
                hint="We'll text them the verification link. US numbers can be entered without a country code."
                type="tel"
                autoComplete="tel"
                value={reviewerPhone}
                onChange={(e) => setReviewerPhone(e.target.value)}
              />
            ) : null}
            <TextAreaField
              label="Optional message for the reviewer"
              hint="Shown at the top of the verification page."
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={2}
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="space-y-3 border-t border-line pt-4">
              {preview.map((c) => (
                <CredentialCard
                  key={c.id}
                  credential={c}
                  verified
                  showResidentNote={sharedNotes.has(c.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === "done" && createdToken ? (
          <div className="space-y-4">
            {emailSent && sentToEmail ? (
              <InlineNotice tone="calm" title="Email sent">
                We sent the verification link to{" "}
                <span className="font-medium text-ink">{sentToEmail}</span>.
              </InlineNotice>
            ) : null}
            {smsSent && sentToPhone ? (
              <InlineNotice tone="calm" title="Text sent">
                We sent the verification link to{" "}
                <span className="font-medium text-ink">{sentToPhone}</span>.
              </InlineNotice>
            ) : null}
            {emailError ? (
              <InlineNotice tone="warning" title="Email could not be sent">
                {emailError} You can still copy the link below.
              </InlineNotice>
            ) : null}
            {smsError ? (
              <InlineNotice tone="warning" title="Text could not be sent">
                {smsError} You can still copy the link below.
              </InlineNotice>
            ) : null}
            <InlineNotice tone="calm" title="Shared directly by you">
              Only the credentials you selected appear on this page. You can revoke
              it from your wallet at any time.
            </InlineNotice>
            <div className="rounded-lg border border-line bg-surface-sunken p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                Verification link
              </p>
              <p className="mt-1 break-all font-mono text-sm text-ink">{shareUrl}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                }}
              >
                <Copy className="size-4" aria-hidden />
                {copied ? "Copied" : "Copy link"}
              </Button>
              {createdToken ? (
                <Button type="button" variant="ghost" onClick={() => openPacket(createdToken)}>
                  Open preview
                  <ExternalLink className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
