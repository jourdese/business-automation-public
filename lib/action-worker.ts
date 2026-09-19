import { createClient } from "@supabase/supabase-js";
import { deliverQueuedActions, type ActionLease } from "./action-delivery";
export async function drainActions() {
  const token = process.env.CC_ACTION_WORKER_TOKEN,
    url = process.env.CC_N8N_ACTION_URL,
    secret = process.env.CC_N8N_ACTION_SECRET;
  if (!token || !url || !secret || process.env.CC_LOCAL_TEST_URL) return;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  try {
    await deliverQueuedActions(
      async (op, p = {}) => {
        const { data, error } = await db.rpc("cc_worker", { token, op, p });
        if (error) throw new Error("Scoped action worker unavailable");
        return data as ActionLease | null;
      },
      url,
      secret,
    );
  } catch {
    /* Durable jobs remain queued or expire to uncertain. Settings exposes recovery. */
  }
}
