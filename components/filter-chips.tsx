"use client";

import { cn } from "@/lib/cn";
import { CREDENTIAL_TYPE_LABELS, type CredentialType } from "@/types";

export interface FilterChipsProps {
  active: CredentialType | "all";
  onChange: (value: CredentialType | "all") => void;
  counts?: Partial<Record<CredentialType | "all", number>>;
}

const ORDER: (CredentialType | "all")[] = [
  "all",
  "on_time_payment",
  "housing_good_standing",
  "landlord_reference",
  "employer_reference",
  "program_participation",
  "job_training_completion",
  "caseworker_endorsement",
];

export function FilterChips({ active, onChange, counts }: FilterChipsProps) {
  return (
    <div
      role="group"
      aria-label="Filter credentials by type"
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {ORDER.map((type) => {
        const label = type === "all" ? "All" : CREDENTIAL_TYPE_LABELS[type];
        const count = counts?.[type];
        const selected = active === type;
        return (
          <button
            key={type}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(type)}
            className={cn(
              "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors",
              selected
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-line-strong bg-surface text-ink-muted hover:border-line hover:text-ink",
            )}
          >
            {label}
            {count !== undefined ? (
              <span className="ml-1.5 text-ink-faint">({count})</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
