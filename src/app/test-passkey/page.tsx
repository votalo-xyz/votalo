/*
 * TEMPORARY TEST ROUTE. Remove this folder (src/app/test-passkey) before delivery.
 * Purpose: confirm passkey creation and per-group member address on a real phone.
 * It never shows or stores the PRF output.
 */
"use client";

import { useState } from "react";
import { createVotaloPasskey, getGroupPrfOutput, isPrfUnavailable, type PasskeyCredential } from "@/lib/identity/passkey";
import { currentRpId } from "@/lib/identity/rpId";
import { memberAddressFromPrf } from "@/lib/identity/memberKey";
import { loadCredential, saveCredential } from "@/lib/identity/credentialStore";
import type { Hex } from "viem";

const TEST_GROUP: Hex = `0x${"aa".repeat(32)}`;

export default function TestPasskeyPage() {
  const [status, setStatus] = useState("");
  const [credential, setCredential] = useState<PasskeyCredential | null>(() => loadCredential());
  const [address, setAddress] = useState("");

  async function create() {
    setStatus("Creating passkey…");
    try {
      const cred = await createVotaloPasskey({ rpId: currentRpId(), displayName: "Test member" });
      saveCredential(cred);
      setCredential(cred);
      setStatus("Passkey created on this origin.");
    } catch (e) {
      setStatus(isPrfUnavailable(e) ? "PRF_UNAVAILABLE: this browser cannot use this passkey type." : `Error: ${String(e)}`);
    }
  }

  async function derive() {
    if (!credential) return;
    setStatus("Waiting for passkey…");
    try {
      const prf = await getGroupPrfOutput({ rpId: currentRpId(), credential, groupId: TEST_GROUP });
      try {
        setAddress(await memberAddressFromPrf(prf));
        setStatus("Member address for the test group:");
      } finally {
        prf.fill(0);
      }
    } catch (e) {
      setStatus(isPrfUnavailable(e) ? "PRF_UNAVAILABLE" : `Error: ${String(e)}`);
    }
  }

  return (
    <main style={{ padding: 16, fontFamily: "system-ui", maxWidth: 480 }}>
      <p style={{ color: "#b00", fontWeight: 700 }}>TEST ROUTE: remove before delivery</p>
      <p>RP id: {currentRpId()}</p>
      <button onClick={create} style={{ padding: 12, width: "100%", marginBottom: 8 }}>
        1. Create passkey
      </button>
      <button onClick={derive} disabled={!credential} style={{ padding: 12, width: "100%" }}>
        2. Derive member address (test group)
      </button>
      <p>{status}</p>
      {address && <code style={{ wordBreak: "break-all" }}>{address}</code>}
    </main>
  );
}
