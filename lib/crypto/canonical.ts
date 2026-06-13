/**
 * Canonical JSON serialization.
 *
 * Hashes and signatures must be computed over a byte-for-byte stable
 * representation. We sort object keys recursively and reject values that
 * have no stable encoding (functions, undefined). Arrays preserve order.
 */
export function canonicalize(value: unknown): string {
  return serialize(value);
}

function serialize(value: unknown): string {
  if (value === null) return "null";

  const t = typeof value;

  if (t === "number") {
    if (!Number.isFinite(value as number)) {
      throw new Error("Cannot canonicalize non-finite number");
    }
    return JSON.stringify(value);
  }

  if (t === "boolean" || t === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((v) => serialize(v ?? null)).join(",")}]`;
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    const body = keys
      .map((k) => `${JSON.stringify(k)}:${serialize(obj[k])}`)
      .join(",");
    return `{${body}}`;
  }

  // undefined / function / symbol have no stable encoding.
  throw new Error(`Cannot canonicalize value of type ${t}`);
}
