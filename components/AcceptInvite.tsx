"use client";
import { useState } from "react";
import { send } from "@/lib/client-api";
export default function AcceptInvite({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await send("accept_invite", { token });
            location.assign("/command-center");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Could not accept invitation");
          } finally {
            setBusy(false);
          }
        }}
      >
        Accept invitation
      </button>
      {message && <p role="alert">{message}</p>}
      <a href={`/account?next=${encodeURIComponent(`/invite/${token}`)}`}>
        Sign in with the invited email
      </a>
    </>
  );
}
