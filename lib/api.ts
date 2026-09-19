import { serverClient } from "./supabase/server";
export const publicOperations = new Set(["menu", "place_order", "order_status", "job_result"]);
export class CommandError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
export async function command<T>(op: string, p: Record<string, unknown> = {}): Promise<T> {
  if (process.env.CC_LOCAL_TEST_URL) {
    if (
      process.env.NODE_ENV !== "development" ||
      process.env.VERCEL ||
      process.env.CC_LOCAL_TEST_URL !== "http://127.0.0.1:4319"
    )
      throw new Error("Local verification is forbidden here");
    const response = await fetch("http://127.0.0.1:4319/command", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op, p }),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new CommandError(result.error);
    return result.data as T;
  }
  const db = await serverClient();
  if (!publicOperations.has(op)) {
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error || !user) throw new CommandError("Sign in to continue.", 401);
  }
  const { data, error } = await db.rpc("cc_api", { op, p });
  if (error)
    throw new CommandError(
      error.code === "P0001"
        ? error.message
        : error.code === "42501"
          ? "You do not have access to this business."
          : "The request could not be saved. Refresh and check the details before trying again.",
      error.code === "42501" ? 403 : 400,
    );
  return data as T;
}
