import * as React from "react";
import {
  Award,
  Briefcase,
  CalendarCheck,
  GraduationCap,
  HandHeart,
  Home,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import type { CredentialType } from "@/types";

const icons: Record<CredentialType, LucideIcon> = {
  on_time_payment: CalendarCheck,
  housing_good_standing: Home,
  landlord_reference: KeyRound,
  employer_reference: Briefcase,
  program_participation: HandHeart,
  job_training_completion: GraduationCap,
  caseworker_endorsement: Award,
};

export function CredentialIcon({
  type,
  className,
}: {
  type: CredentialType;
  className?: string;
}) {
  const Icon = icons[type];
  return <Icon className={className} aria-hidden />;
}

export function getCredentialIcon(type: CredentialType): LucideIcon {
  return icons[type];
}
