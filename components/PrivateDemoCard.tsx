"use client";
import { useState } from "react";
import type { PrivateDemo } from "@/lib/types";
import { send } from "@/lib/client-api";
import CompanionMark from "./jourvis/CompanionMark";

export default function PrivateDemoCard({ initial }: { initial: PrivateDemo | null }) {
  const [demo, setDemo] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    setBusy(true);
    setError("");
    try {
      const result = await send<PrivateDemo>("start_private_demo");
      setDemo(result);
      if (!result.expired) location.assign(`/command-center/${result.businessId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare your demo. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface private-demo-card" aria-labelledby="demo-title">
      <CompanionMark size={44} />
      <p className="eyebrow">OPTIONAL · YOUR OWN PRACTICE SPACE</p>
      <h2 id="demo-title">Try a service with Jourvis.</h2>
      <p>
        A private copy of Marinara’s sample setup: 12 dishes, mock stock and supplier conversations.
        Your changes stay in your copy.
      </p>
      <p>
        No real supplier emails, payments or deliveries. Access lasts seven days; your sign-in email
        is real.
      </p>
      {demo?.expired ? (
        <p role="status">
          Your seven-day demo has ended. Contact Jourvis to arrange a guided session. Your invited
          business access is unchanged.
        </p>
      ) : demo ? (
        <>
          <a className="button" href={`/command-center/${demo.businessId}`}>
            Continue my demo →
          </a>
          <p>
            Available until{" "}
            {new Date(demo.expiresAt).toLocaleDateString("en-PH", {
              timeZone: "Asia/Manila",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            .
          </p>
        </>
      ) : (
        <button onClick={() => void start()} disabled={busy}>
          {busy ? "Preparing your private demo…" : "Create my seven-day demo"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
