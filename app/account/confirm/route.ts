import { serverClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeAuthNext } from "@/lib/auth-redirect";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const db = await serverClient();
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (!error) {
        const jar = await cookies();
        const next = safeAuthNext(decodeURIComponent(jar.get("cc-auth-next")?.value || ""));
        jar.delete("cc-auth-next");
        return NextResponse.redirect(new URL(next, url.origin));
      }
    } catch {
      /* Expired, invalid or unavailable sign-in returns to a safe page. */
    }
  }
  return NextResponse.redirect(new URL("/account?error=expired", url.origin));
}
