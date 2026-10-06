import { RelayClientError } from "@/lib/flows/relayClient";

/** Contract errors the relayer can return. Each has a plain-language message under `Errors`. */
const CONTRACT_ERRORS = [
  "GroupExists",
  "GroupNotFound",
  "InvalidMode",
  "InvalidAdmin",
  "InvalidMember",
  "InvalidNameLength",
  "NotMember",
  "AlreadyMember",
  "InvalidSignature",
  "InviteRequired",
  "InviteNotAllowed",
  "InviteAlreadyUsed",
  "ProposalExists",
  "ProposalNotFound",
  "InvalidTitleLength",
  "InvalidOptionCount",
  "InvalidOptionLength",
  "InvalidDeadline",
  "VotingClosed",
  "AlreadyVoted",
  "InvalidChoice",
] as const;

const RELAY_ERRORS = ["NETWORK", "INTERNAL", "RATE_LIMITED", "DAILY_CAP_REACHED", "RELAYER_NOT_CONFIGURED"] as const;

export type ErrorKey =
  | (typeof CONTRACT_ERRORS)[number]
  | (typeof RELAY_ERRORS)[number]
  | "INVALID_INPUT"
  | "PRF_UNAVAILABLE"
  | "PASSKEY_FAILED"
  | "VAULT_TOO_LARGE"
  | "UNKNOWN";

/**
 * Mera errors are recognised by shape instead of importing Mera: this file is also used by the landing
 * demo, and pulling the whole crypto package into that page would cost load time. `isMeraError` and
 * `isPrfUnavailable` in src/lib do the same check with the class.
 */
function meraCode(e: unknown): string | null {
  if (e instanceof Error && e.name === "MeraError") return (e as Error & { code?: string }).code ?? "";
  return null;
}

/** Maps anything thrown by the flows to a message key. Never shows the raw error name. */
export function classifyError(e: unknown): ErrorKey {
  const mera = meraCode(e);
  if (mera === "PRF_UNAVAILABLE") return "PRF_UNAVAILABLE";
  if (mera !== null) return "PASSKEY_FAILED";
  if (e instanceof RelayClientError) {
    if (e.code.startsWith("INVALID_INPUT")) return "INVALID_INPUT";
    const known = [...CONTRACT_ERRORS, ...RELAY_ERRORS].find((code) => code === e.code);
    if (known) return known;
  }
  // The group-list vault throws the same shape ({ code, status }) as the relay client. It is recognised by
  // shape for the same reason as Mera above: its class lives next to the crypto code.
  const vaultCode = e instanceof Error && "status" in e ? (e as Error & { code?: unknown }).code : undefined;
  if (typeof vaultCode === "string") {
    const code = vaultCode;
    if (code.startsWith("INVALID_INPUT")) return "INVALID_INPUT";
    if (code === "VAULT_STORAGE_NOT_CONFIGURED") return "RELAYER_NOT_CONFIGURED";
    if (code === "TOO_LARGE") return "VAULT_TOO_LARGE";
    const known = RELAY_ERRORS.find((r) => r === code);
    if (known) return known;
  }
  return "UNKNOWN";
}
