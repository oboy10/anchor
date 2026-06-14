"use client";

import { shortFingerprint } from "@/lib/format";
import { setResidentNoteAction } from "@/lib/local/actions";
import { importLedgerFile } from "@/lib/local/portable";
import { summarize } from "@/lib/metrics";
import type { Credential, CredentialType, Resident } from "@/types";
import {
    Briefcase,
    CalendarCheck,
    Plus,
    ShieldCheck,
    Users,
} from "lucide-react";
import * as React from "react";
import { BuildPacketButton } from "./build-packet-button";
import { FilterChips } from "./filter-chips";
import { MetricCard } from "./metric-card";
import { SectionHeader } from "./section-header";
import { TimelineItem } from "./timeline-item";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { TextAreaField } from "./ui/field";

export interface ResidentDashboardProps {
  resident: Resident;
  credentials: Credential[];
}

export function ResidentDashboard({
  resident,
  credentials,
}: ResidentDashboardProps) {
  const [filter, setFilter] = React.useState<CredentialType | "all">("all");
  const [noteTarget, setNoteTarget] = React.useState<Credential | null>(null);
  const [noteText, setNoteText] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const importRef = React.useRef<HTMLInputElement>(null);

  async function handleImportLedger(file: File) {
    try {
      const { attestations, packets } = await importLedgerFile(file);
      const total = attestations + packets;
      alert(
        total > 0
          ? `Imported ${attestations} attestation${attestations === 1 ? "" : "s"} and ${packets} packet${packets === 1 ? "" : "s"}.`
          : "No new attestations or packets to import.",
      );
    } catch {
      alert("That file is not a valid Anchor attestation export.");
    }
  }

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
            "Your cryptographically verified credentials, controlled by you. You decide what, when, and with whom you want to share."
          }
        />
        {resident.pronouns || resident.city ? (
          <p className="text-sm text-ink-muted">
            {[resident.pronouns, resident.city].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </header>

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

      <hr className="border-line" />

      <section aria-labelledby="timeline-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeader
            title="Credential timeline"
            description="Newest first. Each entry is signed by the organization that issued it."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => importRef.current?.click()}
            >
              <Plus className="size-4" aria-hidden />
              Add credentials
            </Button>
            <BuildPacketButton residentId={resident.slug} credentials={credentials} />
            <input
              ref={importRef}
              type="file"
              accept=".anchor,application/octet-stream"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportLedger(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
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
