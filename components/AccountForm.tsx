"use client";
import { useState } from "react";
import { safeAuthNext } from "@/lib/auth-redirect";
import { browserClient } from "@/lib/supabase/browser";
export default function AccountForm({
  configured,
  next = "/command-center",
}: {
  configured: boolean;
  next?: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    try {
      document.cookie = `cc-auth-next=${encodeURIComponent(safeAuthNext(next))}; Path=/; SameSite=Lax; Max-Age=3600${location.protocol === "https:" ? "; Secure" : ""}`;
      const { error } = await browserClient().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/account/confirm`,
        },
      });
      if (error) throw error;
      setMessage(
        "Check your email for a secure sign-in link. It only grants access to businesses that invited you.",
      );
    } catch {
      setMessage("The sign-in email could not be sent. Check the address and try again shortly.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <label>
        Email address
        <input name="email" type="email" autoComplete="email" required disabled={!configured} />
      </label>
      <button disabled={!configured || busy}>
        {busy ? "Sending link…" : "Email me a sign-in link"}
      </button>
      <p role="status">
        {configured ? message : "Sign-in is waiting for the Supabase connection to be configured."}
      </p>
    </form>
  );
}
