import { randomBytes } from "node:crypto";

export function base64UrlEncode(bytes: Buffer | Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function base64UrlDecode(value: string, expectedLength?: number): Buffer {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error("Invalid base64url encoding");
  }
  const decoded = Buffer.from(value, "base64url");
  if (expectedLength !== undefined && decoded.length !== expectedLength) {
    throw new Error(`Expected ${expectedLength} bytes, received ${decoded.length}`);
  }
  return decoded;
}

export function randomBase64Url(bytes: number): string {
  return base64UrlEncode(randomBytes(bytes));
}

export function isLowerHex(value: string, bytes: number): boolean {
  return new RegExp(`^[0-9a-f]{${bytes * 2}}$`).test(value);
}
