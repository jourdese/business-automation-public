import { test } from "node:test";
import assert from "node:assert/strict";
import { deliverQueuedActions } from "../lib/action-delivery.ts";
const url = "https://actions.example.invalid/webhook/command-center-v2";
const secret = "x".repeat(48);
test("ordinary state changes with an empty outbox create zero n8n requests", async () => {
  let sends = 0;
  await deliverQueuedActions(
    async () => null,
    url,
    secret,
    async () => {
      sends++;
    },
  );
  assert.equal(sends, 0);
});
test("only a matching terminal provider receipt marks an external action successful", async () => {
  const calls = [];
  let claimed = false;
  await deliverQueuedActions(
    async (op, p) => {
      calls.push({ op, p });
      if (op === "claim" && !claimed) {
        claimed = true;
        return { id: "job", leaseToken: "lease" };
      }
      return null;
    },
    url,
    secret,
    async (_url, init) => {
      assert.equal(init.headers["x-jourvis-action-key"], secret);
      assert.deepEqual(JSON.parse(init.body), { id: "job", leaseToken: "lease" });
      return Response.json({ id: "job", status: "succeeded", providerReceipt: "gmail-message-id" });
    },
  );
  assert.equal(calls.find((x) => x.op === "finish").p.status, "succeeded");
});
test("network uncertainty is persisted without retrying the provider", async () => {
  let sends = 0,
    finish;
  await deliverQueuedActions(
    async (op, p) => {
      if (op === "finish") {
        finish = p;
        return null;
      }
      return { id: "job", leaseToken: "lease" };
    },
    url,
    secret,
    async () => {
      sends++;
      throw new Error("Timeout");
    },
  );
  assert.equal(sends, 1);
  assert.equal(finish.status, "uncertain");
});
test("malformed or mismatched receipts never confirm delivery", async () => {
  let finish;
  await deliverQueuedActions(
    async (op, p) => {
      if (op === "finish") {
        finish = p;
        return null;
      }
      return { id: "job", leaseToken: "lease" };
    },
    url,
    secret,
    async () => Response.json({ id: "other", status: "succeeded", providerReceipt: "wrong" }),
  );
  assert.equal(finish.status, "uncertain");
});
