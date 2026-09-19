import { createHash } from "node:crypto";
import { Webhook } from "standardwebhooks";

type Mail = { to: string; subject: string; message: string };
type Config = {
  hookSecret: string;
  supabaseUrl: string;
  callback: string;
  gatewayUrl: string;
  gatewaySecret: string;
};
type Receipt = { state: string; lease?: string };
export type MailLedger = (op: string, p: Record<string, unknown>) => Promise<Receipt>;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const subjects: Record<string, string> = {
  signup: "Confirm your Jourvis account",
  magiclink: "Your Jourvis sign-in link",
  invite: "Your Jourvis account invitation",
  recovery: "Recover your Jourvis account",
  email_change: "Confirm your Jourvis email change",
  reauthentication: "Your Jourvis verification code",
};
function https(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash)
    throw new Error("Invalid configuration");
  return url;
}
function address(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > 254 ||
    !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value)
  )
    throw new Error("Invalid recipient");
  return value;
}

/** Build only fixed authentication templates; never render user metadata or accept arbitrary copy. */
export function authMessages(
  payload: unknown,
  config: Pick<Config, "supabaseUrl" | "callback">,
): Mail[] {
  const { user, email_data: data } = payload as {
    user: Record<string, unknown>;
    email_data: Record<string, unknown>;
  };
  const type = String(data?.email_action_type || "");
  if (!Object.hasOwn(subjects, type) || !user) throw new Error("Unsupported auth event");
  const base = https(config.supabaseUrl);
  const callback = https(config.callback);
  if (
    base.pathname !== "/" ||
    base.search ||
    callback.pathname !== "/account/confirm" ||
    callback.search
  )
    throw new Error("Invalid configuration");
  // Hooks are project-wide. Do not silently redirect another application's auth to Jourvis.
  if (data.redirect_to !== callback.href) throw new Error("Unapproved auth redirect");
  function mail(to: unknown, hash: unknown, code: unknown): Mail {
    let instruction: string;
    if (type === "reauthentication") {
      if (typeof code !== "string" || !/^\d{6,10}$/.test(code)) throw new Error("Invalid code");
      instruction = `Your verification code is: ${code}`;
    } else {
      if (typeof hash !== "string" || !/^[a-zA-Z0-9_-]{20,256}$/.test(hash))
        throw new Error("Invalid token");
      const link = new URL("/auth/v1/verify", base);
      link.searchParams.set("token", hash);
      link.searchParams.set("type", type);
      link.searchParams.set("redirect_to", callback.href);
      instruction = `Open this secure link in the browser where you requested it:\n${link.href}`;
    }
    return {
      to: address(to),
      subject: subjects[type],
      message: `${subjects[type]}\n\n${instruction}\n\nThis link or code is for you only. If you did not request it, ignore this email. Signing in does not grant access to a business unless you have been invited.\n\nJourvis`,
    };
  }
  if (type === "email_change") {
    // Supabase's backwards-compatible hash names are deliberately reversed.
    const result = [];
    if (data.token_hash_new) result.push(mail(user.email, data.token_hash_new, data.token));
    result.push(mail(user.new_email, data.token_hash, data.token_new || data.token));
    return result;
  }
  return [mail(user.email, data.token_hash, data.token)];
}

function failure(status: number) {
  return Response.json(
    {
      error: {
        http_code: status,
        message: "Verification email is unavailable. Please request a new link shortly.",
      },
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
async function boundedBody(req: Request) {
  if (!req.body) throw new Error("Empty body");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) throw new Error("Body limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Only signed Supabase hooks may reach n8n. No payload, token, address or provider body is logged. */
export async function handleAuthEmail(
  req: Request,
  config: Config,
  ledger: MailLedger,
  transport: typeof fetch = fetch,
) {
  if (req.method !== "POST") return failure(405);
  let messages: Mail[], id: string, endpoint: URL;
  try {
    endpoint = https(config.gatewayUrl);
    if (config.gatewaySecret.length < 40) return failure(503);
    const raw = await boundedBody(req);
    const secret = config.hookSecret.replace(/^v1,/, "");
    const payload = new Webhook(secret).verify(raw, Object.fromEntries(req.headers));
    id = req.headers.get("webhook-id")!;
    messages = authMessages(payload, config);
  } catch {
    return failure(401);
  }
  try {
    await Promise.all(
      messages.map(async (mail, index) => {
        const messageJson = JSON.stringify(mail);
        const key = digest(`${id}.${index}`);
        const claim = await ledger("claim", { id: key, digest: digest(messageJson) });
        if (claim.state === "sent") return;
        if (claim.state !== "claimed" || !claim.lease)
          throw new Error("Delivery already attempted");
        // Supabase HTTP hooks have a five-second budget. Do not retry an ambiguous send.
        const response = await transport(endpoint, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(2200),
          headers: {
            "content-type": "application/json",
            "x-jourvis-auth-key": config.gatewaySecret,
          },
          body: JSON.stringify({ id: key, lease: claim.lease, messageJson }),
        });
        if (!response.ok) throw new Error("Provider unavailable");
        const text = await response.text();
        if (text.length > 2048) throw new Error("Invalid receipt");
        const receipt = JSON.parse(text);
        if (
          receipt.id !== key ||
          receipt.sent !== true ||
          typeof receipt.providerMessageId !== "string" ||
          !/^[a-zA-Z0-9_-]{1,200}$/.test(receipt.providerMessageId)
        )
          throw new Error("Unverified receipt");
        const finished = await ledger("finish", { id: key, lease: claim.lease });
        if (finished.state !== "sent") throw new Error("Receipt not persisted");
      }),
    );
    return Response.json({}, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure(503);
  }
}
