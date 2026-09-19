"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

export default function SignOut() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function signOut() {
    setBusy(true);
    setFailed(false);
    try {
      const { error } = await browserClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      window.location.assign("/account");
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="text-button" onClick={signOut} disabled={busy}>
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {failed && <small role="alert">Could not sign out. Please retry.</small>}
    </div>
  );
}
