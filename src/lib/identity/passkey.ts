import {
  createPasskeyWithPrfOutput,
  getPasskeyPrfOutput,
  isMeraError,
  type PasskeyCredentialMetadata,
  type WebAuthnClient,
} from "@category-labs/mera";
import type { Hex } from "viem";
import { groupPrfSalt } from "./groupSalt";

export const RP_NAME = "Votalo";

export type PasskeyCredential = PasskeyCredentialMetadata;

/** Creates the user's passkey. Throws MeraError PRF_UNAVAILABLE if this browser cannot use PRF. */
export async function createVotaloPasskey(args: {
  rpId: string;
  displayName: string;
  webAuthnClient?: WebAuthnClient;
}): Promise<PasskeyCredential> {
  const created = await createPasskeyWithPrfOutput({
    rp: { id: args.rpId, name: RP_NAME },
    user: { name: args.displayName, displayName: args.displayName },
    webAuthnClient: args.webAuthnClient,
  });
  return { credentialId: created.credentialId, transports: created.transports };
}

/** PRF output for one group. Same passkey + same group gives the same output on every device. */
export async function getGroupPrfOutput(args: {
  rpId: string;
  credential: PasskeyCredential;
  groupId: Hex;
  webAuthnClient?: WebAuthnClient;
}): Promise<Uint8Array<ArrayBuffer>> {
  const result = await getPasskeyPrfOutput({
    rpId: args.rpId,
    credential: args.credential,
    prfSalt: groupPrfSalt(args.groupId),
    webAuthnClient: args.webAuthnClient,
  });
  return result.prfOutput;
}

export function isPrfUnavailable(error: unknown): boolean {
  return isMeraError(error) && error.code === "PRF_UNAVAILABLE";
}
