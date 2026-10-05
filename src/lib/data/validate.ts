const HEX32 = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** A groupId or proposalId: 32-byte hex. */
export function isEntityId(id: string): boolean {
  return HEX32.test(id);
}

/** A Member id: `${groupId}-${address}`, address lowercase (matches indexer/src/EventHandlers.ts). */
export function isMemberId(id: string): boolean {
  const [groupId, address] = id.split("-");
  return Boolean(groupId && address && HEX32.test(groupId) && ADDRESS.test(address) && address === address.toLowerCase());
}
