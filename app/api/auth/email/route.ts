import { createClient } from "@supabase/supabase-js";
import { handleAuthEmail } from "@/lib/auth-email";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const e = process.env;
  const required = [
    e.CC_AUTH_HOOK_SECRET,
    e.CC_AUTH_MAIL_TOKEN,
    e.CC_N8N_AUTH_URL,
    e.CC_N8N_AUTH_SECRET,
    e.NEXT_PUBLIC_SUPABASE_URL,
    e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ];
  if (
    e.CC_AUTH_EMAIL_ENABLED !== "true" ||
    required.some((value) => !value) ||
    e.CC_LOCAL_TEST_URL
  ) {
    return Response.json(
      { error: { http_code: 503, message: "Verification email is not configured." } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL!, e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(800) }) },
  });
  return handleAuthEmail(
    req,
    {
      hookSecret: e.CC_AUTH_HOOK_SECRET!,
      supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL!,
      callback: "https://jourvis.ai/account/confirm",
      gatewayUrl: e.CC_N8N_AUTH_URL!,
      gatewaySecret: e.CC_N8N_AUTH_SECRET!,
    },
    async (op, p) => {
      const { data, error } = await db.rpc("cc_auth_mail", { token: e.CC_AUTH_MAIL_TOKEN!, op, p });
      if (error) throw new Error("Mail ledger unavailable");
      return data;
    },
  );
}
