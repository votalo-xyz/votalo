import { isAddress, isHex, type Address, type Hex } from "viem";
import { RelayError } from "./errors";

const bytes = (s: string) => new TextEncoder().encode(s).length;

function fail(field: string): never {
  throw new RelayError(`INVALID_INPUT:${field}`, 400);
}

export function hex32(v: unknown, field: string): Hex {
  if (typeof v !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(v) || !isHex(v)) fail(field);
  return v as Hex;
}

export function hexBytes(v: unknown, length: number, field: string): Hex {
  if (typeof v !== "string" || !isHex(v) || v.length !== 2 + length * 2) fail(field);
  return v as Hex;
}

export function address(v: unknown, field: string): Address {
  if (typeof v !== "string" || !isAddress(v, { strict: false })) fail(field);
  return v as Address;
}

export function str(v: unknown, field: string, minBytes: number, maxBytes: number): string {
  if (typeof v !== "string") fail(field);
  const n = bytes(v);
  if (n < minBytes || n > maxBytes) fail(field);
  return v;
}

export function uint(v: unknown, field: string, max: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > max) fail(field);
  return v;
}

export function bigUint(v: unknown, field: string): bigint {
  if (typeof v !== "string" || !/^[0-9]{1,20}$/.test(v)) fail(field);
  return BigInt(v);
}

export function strArray(v: unknown, field: string, minLen: number, maxLen: number, maxBytes: number): string[] {
  if (!Array.isArray(v) || v.length < minLen || v.length > maxLen) fail(field);
  return v.map((item) => str(item, field, 1, maxBytes));
}

/** Parses a JSON body. Non-object bodies are rejected. */
export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new RelayError("INVALID_INPUT:body", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) fail("body");
  return body as Record<string, unknown>;
}
