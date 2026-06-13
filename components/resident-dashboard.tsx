"use client";

import * as React from "react";
import {
  Briefcase,
  CalendarCheck,
  ShieldCheck,
  Users,
} from "lucide-react";
import { revokePacketAction, setResidentNoteAction } from "@/lib/local/actions";
import { FilterChips } from "./filter-chips";
import { MetricCard } from "./metric-card";
import { PacketBuilder } from "./packet-builder";
import { VerifyIdentityCard } from "./verify-identity-card";
import { SectionHeader } from "./section-header";
import { TimelineItem } from "./timeline-item";
import { Dialog } from "./ui/dialog";
import { TextAreaField } from "./ui/field";
import { InlineNotice } from "./ui/inline-notice";
import { Button } from "./ui/button";
import type { Credential, CredentialType, Resident, SharePacket } from "@/types";
import { summarize } from "@/lib/metrics";
import { shortFingerprint } from "@/lib/format";

export interface ResidentDashboardProps {
  resident: Resident;
  credentials: Credential[];
  packets: SharePacket[];
  /** Contact attributes already vouched for by Anchor. */
  verified?: { email?: string; phone?: string };
  /** Show the verify-contact card (only for the signed-in owner's wallet). */
  canVerify?: boolean;
}

export function ResidentDashboard({
  resident,
  credentials,
  packets,
  verified = {},
  canVerify = false,
}: ResidentDashboardProps) {
  const [filter, setFilter] = React.useState<CredentialType | "all">("all");
  const [noteTarget, setNoteTarget] = React.useState<Credential | null>(null);
  const [noteText, setNoteText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const summary = summarize(credentials);
  const sorted = [...credentials].sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
  );
  const filtered =
    filter === "all"
      ? sorted
      : sorted.filter((c) => c.credentialType === filter);

  const counts: Partial<Record<CredentialType | "all", number>> = {
    all: credentials.filter((c) => c.status !== "corrected").length,
  };
  for (const c of credentials) {
    if (c.status === "corrected") continue;
    counts[c.credentialType] = (counts[c.credentialType] ?? 0) + 1;
  }

  async function handleRevoke(token: string) {
    await revokePacketAction(resident.slug, token);
  }

  async function saveNote() {
    if (!noteTarget) return;
    setSaving(true);
    await setResidentNoteAction(resident.slug, noteTarget.id, noteText);
    setSaving(false);
    setNoteTarget(null);
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <SectionHeader
          as="h1"
          serif
          title={`${resident.displayName}'s record`}
          description={
            resident.preferredIntro ??
            "Your verified credentials, controlled by you. This is not a score."
          }
        />
        {resident.pronouns || resident.city ? (
          <p className="text-sm text-ink-muted">
            {[resident.pronouns, resident.city].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <p className="text-sm text-ink-muted">
          Identity fingerprint{" "}
          <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-xs text-ink">
            {resident.fingerprint}
          </code>
        </p>
      </header>

      <InlineNotice tone="calm" title="You stay in control">
        Anchor holds verified positive credentials from organizations you
        worked with. You decide what to share, when, and with whom. Nothing here
        is a credit score or background check result.
      </InlineNotice>

      {canVerify ? (
        <VerifyIdentityCard fingerprint={resident.fingerprint} verified={verified} />
      ) : null}

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="sr-only">
          Record summary
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Verified identity"
            value={shortFingerprint(resident.fingerprint)}
            detail="Ed25519 fingerprint"
            icon={<ShieldCheck className="size-4" aria-hidden />}
          />
          <MetricCard
            label="Housing stability"
            value={
              summary.monthsOfStability > 0
                ? `${summary.monthsOfStability} mo.`
                : "—"
            }
            detail="On-time payments on record"
            icon={<CalendarCheck className="size-4" aria-hidden />}
          />
          <MetricCard
            label="References"
            value={summary.references}
            detail="Landlord & caseworker"
            icon={<Users className="size-4" aria-hidden />}
          />
          <MetricCard
            label="Work & training"
            value={summary.workCredentials}
            detail="Employment credentials"
            icon={<Briefcase className="size-4" aria-hidden />}
          />
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <PacketBuilder
          residentId={resident.slug}
          credentials={credentials}
          existingPackets={packets}
          onRevoke={handleRevoke}
        />
      </section>

      <section aria-labelledby="timeline-heading">
        <SectionHeader
          title="Credential timeline"
          description="Newest first. Each entry is signed by the organization that issued it."
        />
        <div className="mt-4">
          <FilterChips active={filter} onChange={setFilter} counts={counts} />
        </div>
        <div className="mt-6">
          {filtered.length === 0 ? (
            <p className="text-sm text-ink-muted">No credentials match this filter.</p>
          ) : (
            filtered.map((c, i) => (
              <TimelineItem
                key={c.id}
                credential={c}
                isLast={i === filtered.length - 1}
                onEditNote={() => {
                  setNoteTarget(c);
                  setNoteText(c.residentNote ?? "");
                }}
              />
            ))
          )}
        </div>
      </section>

      <section aria-labelledby="help-heading" className="border-t border-line pt-8">
        <SectionHeader
          title="What this can help with"
          description="Use your record when you are ready — there is no rush."
        />
        <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-muted">
          <li>
            <strong className="font-medium text-ink">Housing applications</strong> — share
            payment history, good standing, and landlord references with a property manager.
          </li>
          <li>
            <strong className="font-medium text-ink">Job applications</strong> — show
            training completion and employer references without repeating your story.
          </li>
          <li>
            <strong className="font-medium text-ink">Documentation</strong> — keep a
            verified record you can reference for credit-building and future opportunities.
          </li>
        </ul>
      </section>

      <Dialog
        open={!!noteTarget}
        onClose={() => setNoteTarget(null)}
        title="Personal note"
        description="Optional. Only visible to you unless you include it in a share packet."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setNoteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={saveNote}>
              {saving ? "Saving…" : "Save note"}
            </Button>
          </>
        }
      >
        <TextAreaField
          label="Your note"
          hint="A short line of context — for example, how this credential helped you."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={3}
        />
      </Dialog>
    </div>
  );
}
