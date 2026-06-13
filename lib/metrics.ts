/**
 * Derived, plain-language summaries. Deliberately *not* a score — these are
 * counts and spans drawn directly from issued credentials.
 */
import {
  HOUSING_TYPES,
  REFERENCE_TYPES,
  WORK_TYPES,
  type Credential,
  type SharePacket,
} from "@/types";

export interface ResidentSummary {
  /** Longest payment streak claimed across on-time-payment credentials. */
  monthsOfStability: number;
  references: number;
  workCredentials: number;
  totalCredentials: number;
}

function parsePaymentMonths(metric?: string): number {
  if (!metric) return 0;
  const m = metric.match(/(\d+)\s+(?:consecutive\s+)?(?:on-time\s+)?(?:month|payment)/i);
  return m ? Number(m[1]) : 0;
}

export function summarize(credentials: Credential[]): ResidentSummary {
  const active = credentials.filter((c) => c.status !== "corrected");

  const monthsOfStability = active
    .filter((c) => c.credentialType === "on_time_payment")
    .reduce((max, c) => Math.max(max, parsePaymentMonths(c.evidence.metric)), 0);

  const references = active.filter((c) =>
    REFERENCE_TYPES.includes(c.credentialType),
  ).length;

  const workCredentials = active.filter((c) =>
    WORK_TYPES.includes(c.credentialType),
  ).length;

  return {
    monthsOfStability,
    references,
    workCredentials,
    totalCredentials: active.length,
  };
}

export function housingCredentials(credentials: Credential[]): Credential[] {
  return credentials.filter((c) => HOUSING_TYPES.includes(c.credentialType));
}

export type PacketState = "active" | "expired" | "revoked";

export function packetState(packet: SharePacket, now = Date.now()): PacketState {
  if (packet.revokedAt) return "revoked";
  if (new Date(packet.expiresAt).getTime() <= now) return "expired";
  return "active";
}
