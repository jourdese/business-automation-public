import { sameOrigin } from "@/lib/request-origin";
import { after } from "next/server";
import { drainActions } from "@/lib/action-worker";
import { command, CommandError } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  if (!sameOrigin(req, process.env.NODE_ENV === "development"))
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "JSON is required." }, { status: 415 });
  try {
    const reader = req.body?.getReader();
    if (!reader) throw new CommandError("Request is empty");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 18000) {
        await reader.cancel();
        throw new CommandError("Request is too large", 413);
      }
      chunks.push(value);
    }
    const { op, p } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (
      typeof op !== "string" ||
      !p ||
      Array.isArray(p) ||
      typeof p !== "object" ||
      ["job_result", "begin_action", "claim_job"].includes(op)
    )
      throw new CommandError("Invalid command");
    const data = await command(op, p);
    if (!["menu", "order_status", "snapshot", "my_businesses", "supplier_snapshot"].includes(op))
      after(drainActions);
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof CommandError
            ? e.message
            : "The connection is unavailable. No success has been confirmed.",
      },
      {
        status: e instanceof CommandError ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
