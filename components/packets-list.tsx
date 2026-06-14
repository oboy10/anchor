"use client";

import { ExternalLink } from "lucide-react";
import { buildShareUrl } from "@/lib/local/share-link";
import { formatDate, formatRelativeExpiry } from "@/lib/format";
import { packetState } from "@/lib/metrics";
import { Button } from "./ui/button";
import { StatusBadge } from "./ui/status-badge";
import type { SharePacket } from "@/types";

export interface PacketsListProps {
  packets: SharePacket[];
  onRevoke: (token: string) => Promise<void>;
}

async function openPacket(token: string) {
  const url = await buildShareUrl(token, window.location.origin);
  if (url) window.open(url, "_blank", "noopener");
}

/** The resident's share packets, with preview + revoke controls. */
export function PacketsList({ packets, onRevoke }: PacketsListProps) {
  if (packets.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No packets yet. Build one to share selected credentials with a landlord
        or employer — it will appear here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {packets.map((p) => {
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
  );
}
