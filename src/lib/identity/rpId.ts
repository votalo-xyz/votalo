/**
 * Passkey relying party id. NEXT_PUBLIC_RP_ID when set, otherwise the current hostname.
 * Passkeys are bound to this id, so a preview origin and votalo.xyz do not share passkeys.
 */
export function currentRpId(): string {
  const configured = process.env.NEXT_PUBLIC_RP_ID;
  if (configured) return configured;
  return typeof window !== "undefined" ? window.location.hostname : "localhost";
}
