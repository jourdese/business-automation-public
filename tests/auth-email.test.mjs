import { test } from "node:test";
import assert from "node:assert/strict";
import { Webhook } from "standardwebhooks";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { authMessages, handleAuthEmail } from "../lib/auth-email.ts";
const secret = `whsec_${randomBytes(32).toString("base64")}`;
const config = {
  hookSecret: `v1,${secret}`,
  supabaseUrl: "https://example.supabase.co",
  callback: "https://jourvis.ai/account/confirm",
  gatewayUrl: "https://n8n.example.invalid/webhook/auth",
  gatewaySecret: "test-only-".repeat(6),
};
const payload = {
  user: { email: "owner@example.invalid", user_metadata: { email: "attacker@example.invalid" } },
  email_data: {
    email_action_type: "magiclink",
    token_hash: "a".repeat(56),
    redirect_to: config.callback,
  },
};
function request(p = payload, id = "test-event", date = new Date()) {
  const body = JSON.stringify(p);
  return new Request("https://jourvis.ai/api/auth/email", {
    method: "POST",
    body,
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(date.getTime() / 1000)),
      "webhook-signature": new Webhook(secret).sign(id, date, body),
    },
  });
}
test("signed auth hook sends fixed content, persists receipt and suppresses a duplicate", async () => {
  let state,
    sends = 0;
  const ledger = async (op) => {
    if (op === "claim")
      return state === "sent" ? { state } : { state: "claimed", lease: "test-lease" };
    state = "sent";
    return { state };
  };
  const transport = async (url, init) => {
    sends++;
    assert.equal(url.href, config.gatewayUrl);
    assert.equal(init.redirect, "error");
    const body = JSON.parse(init.body),
      mail = JSON.parse(body.messageJson);
    assert.equal(mail.to, "owner@example.invalid");
    assert.ok(mail.message.includes("https://example.supabase.co/auth/v1/verify?"));
    assert.ok(!mail.message.includes("attacker"));
    return Response.json({ id: body.id, sent: true, providerMessageId: "gmail_receipt" });
  };
  assert.equal((await handleAuthEmail(request(), config, ledger, transport)).status, 200);
  assert.equal((await handleAuthEmail(request(), config, ledger, transport)).status, 200);
  assert.equal(sends, 1);
});
test("missing, tampered, stale or oversized signed requests never touch the ledger or gateway", async () => {
  const forbidden = async () => {
    assert.fail("Must not touch dependencies");
  };
  const bad = request();
  bad.headers.set("webhook-signature", "v1,invalid");
  const stale = request(payload, "old", new Date(Date.now() - 600_000));
  const huge = request({ ...payload, user: { ...payload.user, extra: "x".repeat(70000) } });
  const missing = new Request("https://jourvis.ai/api/auth/email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  for (const req of [bad, stale, huge, missing])
    assert.equal((await handleAuthEmail(req, config, forbidden, forbidden)).status, 401);
});
test("uncertain delivery, false receipts and unavailable ledger never report successful email", async () => {
  let calls = 0;
  const ledger = async (op) => {
    if (op === "finish") assert.fail("No unverified finish");
    return { state: ++calls === 1 ? "claimed" : "uncertain", lease: "x" };
  };
  const unavailable = async () => {
    throw new Error("simulated timeout");
  };
  assert.equal((await handleAuthEmail(request(), config, ledger, unavailable)).status, 503);
  assert.equal(
    (await handleAuthEmail(request(), config, ledger, async () => assert.fail("No resend"))).status,
    503,
  );
  const claimed = async () => ({ state: "claimed", lease: "x" });
  assert.equal(
    (
      await handleAuthEmail(request(), config, claimed, async () =>
        Response.json({ sent: true, id: "wrong", providerMessageId: "x" }),
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await handleAuthEmail(request(), config, unavailable, async () =>
        assert.fail("No send without persistence"),
      )
    ).status,
    503,
  );
});
test("email change mapping, auth actions and exact redirect allowlist", () => {
  for (const type of ["signup", "magiclink", "invite", "recovery"])
    assert.equal(
      authMessages(
        { ...payload, email_data: { ...payload.email_data, email_action_type: type } },
        config,
      ).length,
      1,
    );
  const changed = {
    ...payload,
    user: { email: "old@example.invalid", new_email: "new@example.invalid" },
    email_data: {
      ...payload.email_data,
      email_action_type: "email_change",
      token_hash: "n".repeat(56),
      token_hash_new: "o".repeat(56),
    },
  };
  const mails = authMessages(changed, config);
  assert.deepEqual(
    mails.map((x) => x.to),
    ["old@example.invalid", "new@example.invalid"],
  );
  assert.ok(mails[0].message.includes("token=" + "o".repeat(56)));
  assert.ok(mails[1].message.includes("token=" + "n".repeat(56)));
  delete changed.email_data.token_hash_new;
  assert.equal(authMessages(changed, config).length, 1);
  assert.throws(() =>
    authMessages(
      {
        ...payload,
        email_data: { ...payload.email_data, redirect_to: "https://evil.example/account/confirm" },
      },
      config,
    ),
  );
  assert.throws(() =>
    authMessages(
      { ...payload, email_data: { ...payload.email_data, email_action_type: "custom_email" } },
      config,
    ),
  );
  const reauth = authMessages(
    {
      ...payload,
      email_data: { ...payload.email_data, email_action_type: "reauthentication", token: "123456" },
    },
    config,
  );
  assert.ok(reauth[0].message.includes("123456"));
  assert.ok(!reauth[0].message.includes("/verify"));
});
test("n8n auth workflow consumes a capability before Gmail and never saves execution payloads", () => {
  const w = JSON.parse(readFileSync("workflows/command-center-v2-auth-email.json", "utf8"));
  assert.equal(w.active, false);
  for (const key of ["saveDataErrorExecution", "saveDataSuccessExecution"])
    assert.equal(w.settings[key], "none");
  assert.equal(w.settings.saveManualExecutions, false);
  assert.equal(w.settings.saveExecutionProgress, false);
  assert.equal(w.nodes[0].parameters.authentication, "headerAuth");
  assert.ok(w.nodes.every((n) => n.retryOnFail === false));
  const validate = w.nodes.find((n) => n.name === "Validate auth envelope").parameters.jsCode;
  const envelope = {
    id: "a".repeat(64),
    lease: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    messageJson: JSON.stringify({
      to: "owner@example.invalid",
      subject: "Sign in",
      message: "Fixed message",
    }),
  };
  const run = (b) =>
    vm.runInNewContext(`(function(){${validate}})()`, {
      $input: { first: () => ({ json: { body: b } }) },
    });
  assert.equal(run(envelope)[0].json.mail.subject, "Sign in");
  assert.throws(() => run({ ...envelope, unexpected: true }));
  const bodyExpression = w.nodes.find((n) => n.name === "Consume auth mail capability").parameters.jsonBody;
  // n8n closes an expression at the first unescaped double closing brace.
  // Adjacent nested object braces must not terminate the expression early.
  assert.ok(bodyExpression.startsWith("={{"));
  assert.equal(bodyExpression.indexOf("}}"), bodyExpression.length - 2);
  const requestBody = JSON.parse(vm.runInNewContext(bodyExpression.slice(3, -2), {
    $json: run(envelope)[0].json,
  }));
  assert.deepEqual(requestBody, { token: "", op: "begin", p: envelope });
  const gate = w.nodes.find((n) => n.name === "Require capability receipt").parameters.jsCode;
  assert.throws(() =>
    vm.runInNewContext(`(function(){${gate}})()`, {
      $input: { first: () => ({ json: { state: "sent" } }) },
    }),
  );
  assert.equal(
    w.connections["Consume auth mail capability"].main[0][0].node,
    "Require capability receipt",
  );
  assert.equal(
    w.connections["Require capability receipt"].main[0][0].node,
    "Send verification email",
  );
});
