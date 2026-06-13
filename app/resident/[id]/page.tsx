import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ResidentDashboard } from "@/components/resident-dashboard";
import {
  getLedger,
  getResident,
  listPacketsForResident,
} from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resident = await getResident(id);
  return {
    title: resident
      ? `${resident.displayName}'s wallet`
      : "Resident wallet",
  };
}

export default async function ResidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resident = await getResident(id);
  if (!resident) notFound();

  const credentials = await getLedger(id);
  const packets = await listPacketsForResident(id);

  return (
    <AppShell
      context="Resident wallet"
      links={[
        { href: "/demo", label: "Demo" },
        { href: "/provider", label: "Provider" },
        { href: `/verify/demo-maple-street`, label: "Sample packet" },
      ]}
    >
      <ResidentDashboard
        resident={resident}
        credentials={credentials}
        packets={packets}
      />
    </AppShell>
  );
}
