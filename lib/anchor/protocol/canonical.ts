import type { AnchorMessageBody, AnchorPayloadEntry, AnchorValue } from "./types";

export function canonicalizeValue(value: AnchorValue): string {
  return serialize(value, "$");
}

export function canonicalizePayload(entries: AnchorPayloadEntry[]): string {
  if (!Array.isArray(entries)) throw new Error("Payload must be an array");
  const tuples = entries.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Payload entry ${index} must be an object`);
    }
    if (typeof entry.k !== "string" || entry.k.length === 0) {
      throw new Error(`Payload entry ${index} has invalid key`);
    }
    return `[${JSON.stringify(entry.k)},${canonicalizeValue(entry.v)}]`;
  });
  return `[${tuples.join(",")}]`;
}

export function canonicalizeMessageBody(body: AnchorMessageBody): string {
  if (body.v !== 1) throw new Error("Unsupported message version");
  if (typeof body.from !== "string" || typeof body.to !== "string") {
    throw new Error("Message from/to must be strings");
  }
  if (typeof body.nonce !== "string") throw new Error("Message nonce must be a string");

  return `{"v":1,"from":${JSON.stringify(body.from)},"to":${JSON.stringify(
    body.to,
  )},"nonce":${JSON.stringify(body.nonce)},"payload":${canonicalizePayload(
    body.payload,
  )}}`;
}

export function canonicalMessageBytes(body: AnchorMessageBody): Buffer {
  return Buffer.from(canonicalizeMessageBody(body), "utf8");
}

function serialize(value: unknown, path: string): string {
  if (value === null) return "null";
  if (value === undefined) throw new Error(`Cannot canonicalize undefined at ${path}`);

  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") return JSON.stringify(value);

  if (valueType === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Only safe integer numbers are supported at ${path}`);
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item, i) => serialize(item, `${path}[${i}]`)).join(",")}]`;
  }

  if (valueType === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys
      .map((key) => {
        const item = obj[key];
        if (item === undefined) {
          throw new Error(`Cannot canonicalize undefined at ${path}.${key}`);
        }
        return `${JSON.stringify(key)}:${serialize(item, `${path}.${key}`)}`;
      })
      .join(",")}}`;
  }

  throw new Error(`Cannot canonicalize ${valueType} at ${path}`);
}
