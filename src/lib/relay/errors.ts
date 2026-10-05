/** Error returned by relay routes. `code` is a Votalo contract error name or a relay-level code. */
export class RelayError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly txHash?: string,
  ) {
    super(code);
  }
}

/** Contract custom errors a client can show in plain language. */
export const CONTRACT_ERRORS = [
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
