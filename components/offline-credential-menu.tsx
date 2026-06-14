"use client";

import * as React from "react";
import { Link2, Upload } from "lucide-react";
import { importLedgerFile } from "@/lib/local/portable";
import { buttonVariants } from "./ui/button";

export function OfflineCredentialMenu({
  fingerprint,
  displayName,
  onNotice,
}: {
  fingerprint: string;
  displayName: string;
  onNotice?: (message: string) => void;
}) {
  const importRef = React.useRef<HTMLInputElement>(null);

  function notify(message: string) {
    onNotice?.(message);
  }

  async function handleImport(file: File) {
    try {
      const { attestations, packets } = await importLedgerFile(file);
      const total = attestations + packets;
      notify(
        total > 0
          ? `Imported ${attestations} offline credential${attestations === 1 ? "" : "s"}.`
          : "That file was already in your wallet.",
      );
    } catch {
      notify("That file is not a valid Anchor credential export.");
    }
  }

  async function copyIssueLink() {
    if (typeof window === "undefined") return;
    const url = new URL("/credential/sign", window.location.origin);
    url.searchParams.set("mode", "offline-credential");
    url.searchParams.set("to", fingerprint);
    const link = url.toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sign an Anchor credential",
          text: `${displayName} is requesting a signed credential (offline file).`,
          url: link,
        });
        notify("Issue link opened in your share sheet.");
        return;
      } catch {
        /* fall through */
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      notify("Offline issue link copied. Send it to whoever will sign your credential.");
    } catch {
      window.prompt("Copy this offline issue link:", link);
      notify("Offline issue link ready to copy.");
    }
  }

  return (
    <>
      <details className="group relative">
        <summary className="list-none">
          <span className={buttonVariants("secondary", "md")}>
            <Upload className="size-4" aria-hidden />
            Offline credential
          </span>
        </summary>
        <div className="liquid-glass absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-card p-1 shadow-[0_18px_48px_rgba(43,42,38,0.14)]">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[0.65rem] px-3 py-2 text-left text-sm font-medium text-ink hover:bg-white/60"
            onClick={() => importRef.current?.click()}
          >
            <Upload className="size-4 text-accent" aria-hidden />
            Upload credential file
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[0.65rem] px-3 py-2 text-left text-sm font-medium text-ink hover:bg-white/60"
            onClick={copyIssueLink}
          >
            <Link2 className="size-4 text-accent" aria-hidden />
            Copy issue link
          </button>
        </div>
      </details>
      <input
        ref={importRef}
        type="file"
        accept=".anchor,application/octet-stream"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
