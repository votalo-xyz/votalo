import { recoverAddress, zeroHash, type Address, type Hex } from "viem";
import {
  digestCreateGroup,
  digestCreateProposal,
  digestJoin,
  digestVote,
} from "../chain/typedData";
import { GAS_LIMITS } from "./gas";
import { RelayError } from "./errors";
import { address, bigUint, hex32, hexBytes, jsonBody, str, strArray, uint } from "./validate";

export type ActionName = "createGroup" | "join" | "createProposal" | "vote";

export type ParsedAction = {
  action: ActionName;
  /** Address the signature must recover to. */
  signer: Address;
  digest: Hex;
  signature: Hex;
  /** Arguments for the contract call, in ABI order. */
  args: readonly unknown[];
  gas: bigint;
};

const SIG_BYTES = 65;

/** Parses and validates one relay request body. Throws RelayError(INVALID_INPUT:<field>). */
export async function parseAction(action: ActionName, req: Request): Promise<ParsedAction> {
  const b = await jsonBody(req);
  switch (action) {
    case "createGroup": {
      const groupId = hex32(b.groupId, "groupId");
      const mode = uint(b.mode, "mode", 1);
      const admin = address(b.admin, "admin");
      const name = str(b.name, "name", 1, 80);
      const signature = hexBytes(b.signature, SIG_BYTES, "signature");
      const digest = digestCreateGroup({ groupId, mode, admin, name });
      return {
        action,
        signer: admin,
        digest,
        signature,
        args: [groupId, mode, admin, name, signature],
        gas: GAS_LIMITS.createGroup,
      };
    }
    case "join": {
      const groupId = hex32(b.groupId, "groupId");
      const member = address(b.member, "member");
      const signature = hexBytes(b.signature, SIG_BYTES, "signature");
      const inviteId = b.inviteId === undefined ? zeroHash : hex32(b.inviteId, "inviteId");
      const adminInviteSig: Hex =
        b.adminInviteSig === undefined || b.adminInviteSig === "0x"
          ? "0x"
          : hexBytes(b.adminInviteSig, SIG_BYTES, "adminInviteSig");
      const digest = digestJoin({ groupId, member });
      return {
        action,
        signer: member,
        digest,
        signature,
        args: [groupId, member, signature, inviteId, adminInviteSig],
        gas: GAS_LIMITS.join,
      };
    }
    case "createProposal": {
      const groupId = hex32(b.groupId, "groupId");
      const proposalId = hex32(b.proposalId, "proposalId");
      const author = address(b.author, "author");
      const title = str(b.title, "title", 1, 140);
      const options = strArray(b.options, "options", 2, 6, 40);
      const deadline = bigUint(b.deadline, "deadline");
      const signature = hexBytes(b.signature, SIG_BYTES, "signature");
      const digest = digestCreateProposal({ groupId, proposalId, author, title, options, deadline });
      return {
        action,
        signer: author,
        digest,
        signature,
        args: [groupId, proposalId, author, title, options, deadline, signature],
        gas: GAS_LIMITS.createProposal,
      };
    }
    case "vote": {
      const proposalId = hex32(b.proposalId, "proposalId");
      const member = address(b.member, "member");
      const choice = uint(b.choice, "choice", 255);
      const signature = hexBytes(b.signature, SIG_BYTES, "signature");
      const digest = digestVote({ proposalId, member, choice });
      return {
        action,
        signer: member,
        digest,
        signature,
        args: [proposalId, member, choice, signature],
        gas: GAS_LIMITS.vote,
      };
    }
  }
}

/** Off-chain check before any simulation or send: the signature must recover to the claimed signer. */
export async function checkSigner(p: ParsedAction): Promise<void> {
  let recovered: Address | undefined;
  try {
    recovered = await recoverAddress({ hash: p.digest, signature: p.signature });
  } catch {
    recovered = undefined;
  }
  if (!recovered || recovered.toLowerCase() !== p.signer.toLowerCase()) {
    throw new RelayError("InvalidSignature", 422);
  }
}
