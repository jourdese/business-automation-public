import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const workflow = JSON.parse(readFileSync("workflows/command-center-v2-actions.json", "utf8"));
function run(name, input, previous = {}) {
  const code = workflow.nodes.find((n) => n.name === name).parameters.jsCode;
  return JSON.parse(
    JSON.stringify(
      runInNewContext(`(function(){${code}})()`, {
        $input: { first: () => ({ json: input }) },
        $: () => ({ first: () => ({ json: previous }) }),
      }),
    ),
  );
}
const id = "11111111-1111-4111-8111-111111111111";
const leaseToken = "22222222-2222-4222-8222-222222222222";
test("gateway rejects unapproved recipient overrides before consuming a lease", () => {
  assert.equal(workflow.active, false);
  assert.equal(workflow.nodes[0].parameters.authentication, "headerAuth");
  assert.throws(
    () =>
      run("Validate lease envelope", { body: { id, leaseToken, to: "override@example.invalid" } }),
    /Invalid/,
  );
  assert.throws(
    () => run("Validate lease envelope", { body: { id, leaseToken: "invalid" } }),
    /Invalid/,
  );
  assert.deepEqual(run("Validate lease envelope", { body: { id, leaseToken } }), [
    { json: { op: "begin_action", p: { id, leaseToken } } },
  ]);
});
test("gateway builds approved plain text and distinguishes provider uncertainty", () => {
  const action = {
    id,
    kind: "supplier_purchase",
    recipient: "supplier@example.com",
    purchase: {
      id,
      product: "Basil",
      packs: 2,
      packSize: 1,
      packPrice: 50000,
      deliveryFee: 5000,
      terms: "Payment on delivery",
    },
  };
  const email = run("Prepare approved email", action)[0].json;
  assert.equal(email.to, action.recipient);
  assert.match(email.message, /\nBasil\n/);
  assert.match(email.message, /PHP 500\.00/);
  assert.throws(
    () => run("Prepare approved email", { ...action, recipient: "demo@example.invalid" }),
    /Unsupported/,
  );
  assert.equal(
    run("Return provider receipt", { sent: true }, { correlationId: id })[0].json.status,
    "uncertain",
  );
  assert.deepEqual(
    run(
      "Return provider receipt",
      { sent: true, providerMessageId: "provider-1" },
      { correlationId: id },
    )[0].json,
    { id, status: "succeeded", providerReceipt: "provider-1" },
  );
  assert.equal(
    run("Return provider receipt", { sent: false }, { correlationId: id })[0].json.notSent,
    true,
  );
});
