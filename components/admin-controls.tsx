"use client";

import * as React from "react";
import { exportData, importData } from "@/lib/local/db";
import { resetDataAction } from "@/lib/local/actions";
import { Button } from "@/components/ui/button";

export function AdminControls() {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  async function handleExport() {
    const json = await exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anchor-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    setBusy(true);
    try {
      await importData(await file.text());
      window.location.reload();
    } catch {
      alert("That file is not a valid Anchor export.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={handleExport}>
        Export data
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        Import data
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          if (!confirm("Erase all local data? This cannot be undone.")) return;
          await resetDataAction();
          window.location.reload();
        }}
      >
        Reset data
      </Button>
    </div>
  );
}
