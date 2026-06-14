"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { WalletTabs } from "@/components/wallet-tabs";
import { VerifyIdentityCard } from "@/components/verify-identity-card";
import { LocalDataGate } from "@/components/local-data-gate";
import { SectionHeader } from "@/components/section-header";
import { FormField, SelectField, TextAreaField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { useLocalQuery } from "@/lib/local/hooks";
import { setIssuerType } from "@/lib/local/accounts";
import { saveProfileAction, PROFILE_PROP } from "@/lib/local/actions";
import { getActiveResident, getVouches } from "@/lib/local/db";
import { ISSUER_TYPE_LABELS, type Attestation, type IssuerType } from "@/types";

/** Parse verified contact attributes out of the Anchor identity vouches. */
function verifiedContacts(vouches: Attestation[]): { email?: string; phone?: string } {
  const out: { email?: string; phone?: string } = {};
  for (const v of vouches) {
    for (const p of v.properties) {
      if (p.key === "a.id:email") out.email = p.value;
      if (p.key === "a.id:phone") out.phone = p.value;
    }
  }
  return out;
}

/** Parse the self-signed profile (name + description) out of the vouches. */
function selfProfile(vouches: Attestation[]): { name: string; description: string } {
  const out = { name: "", description: "" };
  for (const v of vouches) {
    for (const p of v.properties) {
      if (p.key === PROFILE_PROP.NAME) out.name = p.value;
      if (p.key === PROFILE_PROP.DESCRIPTION) out.description = p.value;
    }
  }
  return out;
}

function ProfileForm({ initial }: { initial: { name: string; description: string } }) {
  const [name, setName] = React.useState(initial.name);
  const [description, setDescription] = React.useState(initial.description);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    const res = await saveProfileAction({ name, description });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="mt-4 max-w-xl space-y-4">
      <FormField
        label="Name"
        hint="How you appear to others — used as the issuer name when you sign credentials."
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Maple Street Shelter"
      />
      <TextAreaField
        label="Description"
        hint="A short public description of who you are."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "Signing…" : "Save profile"}
        </Button>
        {saved ? <span className="text-sm text-accent">Saved & signed.</span> : null}
      </div>
    </div>
  );
}

export function VerifyIdentityContent() {
  const { active, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !active) router.replace("/sign-in");
  }, [loading, active, router]);

  const query = useLocalQuery(async () => {
    const resident = await getActiveResident();
    if (!resident) return null;
    const vouches = await getVouches(resident.fingerprint);
    return {
      resident,
      verified: verifiedContacts(vouches),
      profile: selfProfile(vouches),
    };
  }, []);

  if (!loading && !active) return null;

  return (
    <>
      <WalletTabs />
      <div className="mt-8">
        <LocalDataGate
          loading={loading || query.loading}
          missing={!query.data}
          missingTitle="No wallet yet"
          missingBody="Create an account to generate your identity keypair."
        >
          {query.data && active ? (
            <div className="space-y-8">
              <SectionHeader
                as="h1"
                serif
                title="Edit profile"
                description="Verify your email first — then set how you appear when you issue credentials."
              />

              <VerifyIdentityCard
                fingerprint={query.data.resident.fingerprint}
                verified={{
                  ...query.data.verified,
                  email: active.verifiedEmail ?? query.data.verified.email,
                  phone: active.verifiedPhone ?? query.data.verified.phone,
                }}
              />

              <section className="rounded-card border border-line bg-surface p-5 shadow-card">
                <SectionHeader
                  title="Profile"
                  description="Your name and description are saved as a self-signed vouch — recorded in your ledger and signed by your own key."
                />
                <ProfileForm
                  key={query.data.resident.fingerprint}
                  initial={query.data.profile}
                />
              </section>

              <section className="rounded-card border border-line bg-surface p-5 shadow-card">
                <SectionHeader
                  title="Issuer profile"
                  description="The role applied to credentials you sign. Recipients see this as the issuer type."
                />
                <div className="mt-4 max-w-sm">
                  <SelectField
                    label="Issuer type"
                    value={active.issuerType ?? "caseworker"}
                    onChange={(e) =>
                      setIssuerType(active.fingerprint, e.target.value as IssuerType)
                    }
                    options={Object.entries(ISSUER_TYPE_LABELS).map(([v, l]) => ({
                      value: v,
                      label: l,
                    }))}
                  />
                </div>
              </section>
            </div>
          ) : null}
        </LocalDataGate>
      </div>
    </>
  );
}
