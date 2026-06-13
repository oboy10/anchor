import type { AnchorMessageType, AnchorPayloadEntry, AnchorValue } from "./types";

const SUPPORTED_TYPES = new Set<AnchorMessageType>([
  "identity",
  "reference",
  "rent_history",
  "payment_history",
  "organization_support",
  "outcome",
  "revocation",
  "dispute",
]);

const REQUIRED_BY_TYPE: Record<AnchorMessageType, string[]> = {
  identity: ["a.id:method"],
  reference: ["a.ref:relationship", "a.ref:claim"],
  rent_history: [
    "a.rent:start_month",
    "a.rent:end_month",
    "a.rent:currency",
    "a.rent:on_time_count",
    "a.rent:late_count",
  ],
  payment_history: [
    "a.rent:start_month",
    "a.rent:end_month",
    "a.rent:currency",
    "a.rent:on_time_count",
    "a.rent:late_count",
  ],
  organization_support: ["a.org:name", "a.org:status"],
  outcome: ["a.out:related", "a.out:kind", "a.out:result"],
  revocation: ["a.rev:target", "a.rev:reason"],
  dispute: ["a.dis:target", "a.dis:reason", "a.dis:status"],
};

export function payloadValues(payload: AnchorPayloadEntry[], key: string): AnchorValue[] {
  return payload.filter((entry) => entry.k === key).map((entry) => entry.v);
}

export function payloadString(payload: AnchorPayloadEntry[], key: string): string | undefined {
  const value = payloadValues(payload, key)[0];
  return typeof value === "string" ? value : undefined;
}

export function payloadInteger(payload: AnchorPayloadEntry[], key: string): number | undefined {
  const value = payloadValues(payload, key)[0];
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return undefined;
}

export function messageType(payload: AnchorPayloadEntry[]): AnchorMessageType | undefined {
  const type = payloadString(payload, "a:type");
  return type && SUPPORTED_TYPES.has(type as AnchorMessageType)
    ? (type as AnchorMessageType)
    : undefined;
}

export function chainPrev(payload: AnchorPayloadEntry[]): string | undefined {
  return payloadString(payload, "a.ch:prev");
}

export function appendChainLink(
  previous: { fp: string } | string | null | undefined,
  payload: AnchorPayloadEntry[],
): AnchorPayloadEntry[] {
  if (!previous) return payload;
  const prev = typeof previous === "string" ? previous : previous.fp;
  return payload.some((entry) => entry.k === "a.ch:prev")
    ? payload
    : [...payload, { k: "a.ch:prev", v: prev }];
}

export function validateTypedPayload(payload: AnchorPayloadEntry[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(payload)) return ["Payload must be an ordered entry array"];

  for (const [index, entry] of payload.entries()) {
    if (!entry || typeof entry !== "object") {
      errors.push(`Payload entry ${index} must be an object`);
      continue;
    }
    if (typeof entry.k !== "string" || entry.k.length === 0) {
      errors.push(`Payload entry ${index} has invalid key`);
    }
    validateSupportedValue(entry.v, `payload[${index}].v`, errors);
  }

  const type = payloadString(payload, "a:type");
  if (!type) errors.push("Missing required a:type");
  if (type && !SUPPORTED_TYPES.has(type as AnchorMessageType)) {
    errors.push(`Unsupported a:type ${type}`);
  }
  if (!payloadString(payload, "a:ts")) errors.push("Missing required a:ts");

  const typed = messageType(payload);
  if (typed) {
    for (const required of REQUIRED_BY_TYPE[typed]) {
      if (payloadValues(payload, required).length === 0) {
        errors.push(`Missing required ${required}`);
      }
    }
  }

  return errors;
}

function validateSupportedValue(value: unknown, path: string, errors: string[]): void {
  if (value === null) return;
  if (value === undefined) {
    errors.push(`${path} is undefined`);
    return;
  }
  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") return;
  if (valueType === "number") {
    if (!Number.isSafeInteger(value)) errors.push(`${path} must be an integer`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateSupportedValue(item, `${path}[${index}]`, errors));
    return;
  }
  if (valueType === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      validateSupportedValue(item, `${path}.${key}`, errors);
    }
    return;
  }
  errors.push(`${path} has unsupported type ${valueType}`);
}
