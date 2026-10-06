"use client";

import { useSyncExternalStore } from "react";
import type { Hex } from "viem";
import { storeCredential } from "@/components/use-credential";
import { loadCredential } from "@/lib/identity/credentialStore";
import { memberAddressFromPrf } from "@/lib/identity/memberKey";
import { getGroupPrfOutput, type PasskeyCredential } from "@/lib/identity/passkey";
import { currentRpId } from "@/lib/identity/rpId";
import { restoreVault, restoreVaultFromPasskey, saveVault } from "@/lib/vault/client";
import type { VaultGroupEntry } from "@/lib/vault/types";
import { resolveDataMode } from "./mode";
import { invalidateRemote } from "./remote";
import { getStoreSnapshot, updateStore } from "./store";

/**
 * The encrypted copy of "my groups" (src/lib/vault). The list of group ids lives in this browser; the copy
 * lets the same passkey bring it to another device. The server only ever holds ciphertext.
 */

/* ------------------------------------------------------------------ saving */

export type BackupStatus = "idle" | "saving" | "saved" | "failed";

let status: BackupStatus = "idle";
let pending = 0;
let queue: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function setStatus(next: BackupStatus) {
  status = next;
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Where the last copy of the group list stands, so any screen can say so. */
export function useBackupStatus(): BackupStatus {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => "idle",
  );
}

const shortId = (id: string) => `${id.slice(0, 6)}…${id.slice(-4)}`;

/** Every group this browser belongs to, in the shape the vault stores. */
function currentEntries(credential: PasskeyCredential): VaultGroupEntry[] {
  const { members, groups } = getStoreSnapshot();
  const names = new Map(groups.map((g) => [g.id.toLowerCase(), g.name]));
  return Object.entries(members).map(([id, member]) => ({
    groupId: id as Hex,
    name: member.name ?? names.get(id.toLowerCase()) ?? shortId(id),
    joinedAt: member.joinedAt,
    credentialId: credential.credentialId,
    memberAddress: member.address,
  }));
}

/**
 * Saves the full list of groups, encrypted, after a group is created or joined. Never throws: the group
 * already exists, so a failed copy only changes the status (and the screen offers to try again). One
 * save at a time, each reading the list as it is when it runs.
 */
export function backUpGroups(credential: PasskeyCredential): Promise<void> {
  pending += 1;
  setStatus("saving");
  const run = async () => {
    let ok = false;
    try {
      await saveVault({ rpId: currentRpId(), credential, groups: currentEntries(credential) });
      ok = true;
    } catch {
      // Cancelled prompt, no network, storage not configured: all show as "not saved".
    }
    pending -= 1;
    // Each save writes the whole list, so only the last one decides whether the copy is up to date.
    if (pending === 0) setStatus(ok ? "saved" : "failed");
  };
  queue = queue.then(run, run);
  return queue;
}

/** Tries the copy again with the passkey this device already has. */
export function retryBackup(): Promise<void> {
  const credential = loadCredential();
  return credential ? backUpGroups(credential) : Promise.resolve();
}

/* --------------------------------------------------------------- restoring */

export type RestoreResult =
  | { status: "none" }
  | { status: "done"; added: number; total: number; partial: boolean };

/** One passkey prompt per group: the member address for a group comes from that group's own key. Only
 * used for entries saved before addresses were stored in the vault. */
async function memberAddress(credential: PasskeyCredential, groupId: Hex) {
  const prf = await getGroupPrfOutput({ rpId: currentRpId(), credential, groupId });
  try {
    return await memberAddressFromPrf(prf);
  } finally {
    prf.fill(0);
  }
}

/**
 * Signs in with the passkey and brings back the groups saved for it. On a device that has no passkey saved
 * yet, the platform picks one (the "sign in" step) and the same prompt gives the vault key, so a new device
 * needs one prompt for the list. Each group's member address is read from the vault, so there is no
 * per-group prompt, except for groups saved before addresses were stored. Returns `{ status: "none" }` when
 * this passkey has never saved a list. Throws what the passkey and the vault throw (`classifyError` turns
 * it into a message).
 */
export async function restoreMyGroups(onProgress?: (done: number, total: number) => void): Promise<RestoreResult> {
  const rpId = currentRpId();
  let credential = loadCredential();
  let saved: VaultGroupEntry[] | null;
  if (credential) {
    saved = await restoreVault({ rpId, credential });
  } else {
    const found = await restoreVaultFromPasskey({ rpId });
    credential = found.credential;
    storeCredential(credential);
    saved = found.groups;
  }
  if (saved === null) return { status: "none" };

  const known = new Set(Object.keys(getStoreSnapshot().members).map((id) => id.toLowerCase()));
  const missing = saved.filter((g) => !known.has(g.groupId.toLowerCase()));
  const local = (await resolveDataMode().catch(() => "live")) === "local";

  let added = 0;
  let failure: unknown = null;
  for (const entry of missing) {
    onProgress?.(added, missing.length);
    try {
      const address = entry.memberAddress ?? (await memberAddress(credential, entry.groupId));
      const id = entry.groupId.toLowerCase() as Hex;
      updateStore((s) => ({
        ...s,
        // Without an indexer there is nothing else to say what the group is called.
        groups:
          local && !s.groups.some((g) => g.id.toLowerCase() === id)
            ? [...s.groups, { id, name: entry.name, mode: "open", members: 1, mine: false, demo: false }]
            : s.groups,
        members: { ...s.members, [id]: { address, joinedAt: entry.joinedAt, name: entry.name } },
      }));
      added += 1;
    } catch (err) {
      failure = err;
      break;
    }
  }
  if (added > 0) invalidateRemote();
  // Nothing came back and the passkey was the problem: say so instead of reporting an empty restore.
  if (failure && added === 0) throw failure;
  return { status: "done", added, total: missing.length, partial: added < missing.length };
}
