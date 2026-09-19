"use client";
import { useState } from "react";
import type { Snapshot } from "@/lib/types";
import type { RunCommand } from "./WorkspaceUI";
import Dialog from "./Dialog";
export default function ActionRecovery({
  job,
  run,
  busy,
}: {
  job: Snapshot["jobs"][number];
  run: RunCommand;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button className="text-button" onClick={() => setOpen(true)}>
        Review delivery
      </button>
      {open && (
        <Dialog title="Resolve an external action" close={() => setOpen(false)}>
          <p>
            Check the provider’s sent records or contact the supplier before recording an outcome.
            An uncertain result may already have sent a message.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                await run("reconcile_job", {
                  id: job.id,
                  outcome: f.get("outcome"),
                  reference: f.get("reference"),
                });
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not save.");
              }
            }}
          >
            <label>
              Verified outcome
              <select name="outcome">
                <option value="sent">Sent — provider record found</option>
                <option value="not_sent">Not sent — independently verified</option>
              </select>
            </label>
            <label>
              Provider ID or verification reference
              <textarea name="reference" required minLength={5} maxLength={300} />
            </label>
            <button disabled={busy}>Record verified outcome</button>
          </form>
          {job.status === "failed" &&
            [
              "owner_verified_not_sent",
              "gateway_auth_rejected",
              "action_rejected_before_send",
            ].includes(job.error_code) && (
              <>
                <hr />
                <p>
                  No send has been confirmed for this attempt. The new attempt rechecks the current
                  purchase and supplier relationship.
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run("retry_action", { id: job.id })
                      .then(() => setOpen(false))
                      .catch((e) => setError(e instanceof Error ? e.message : "Could not queue."))
                  }
                >
                  Authorize one new attempt
                </button>
              </>
            )}
          {error && <p role="alert">{error}</p>}
        </Dialog>
      )}
    </>
  );
}
