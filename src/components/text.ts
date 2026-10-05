const encoder = new TextEncoder();

/** The contract limits text by bytes, not characters: "ñ" and emoji take more than one. */
export function byteLength(value: string): number {
  return encoder.encode(value).length;
}
