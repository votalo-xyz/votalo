/** "0x2cd3…f072". Kept apart from site.ts so client components do not pull chain config into their bundle. */
export function shortAddress(address: string, head = 6, tail = 4) {
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}
