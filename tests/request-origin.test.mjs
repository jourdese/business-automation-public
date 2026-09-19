import { test } from "node:test";
import assert from "node:assert/strict";
import { sameOrigin } from "../lib/request-origin.ts";
test("origin validation uses the actual host and rejects cross-site, missing and downgraded origins", () => {
  const req = (origin, host = "jourvis.ai") =>
    new Request("http://internal:3000/api/command-center", {
      headers: { host, ...(origin ? { origin } : {}) },
    });
  assert.equal(sameOrigin(req("https://jourvis.ai")), true);
  assert.equal(sameOrigin(req("https://evil.example")), false);
  assert.equal(sameOrigin(req("null")), false);
  assert.equal(sameOrigin(req(null)), false);
  assert.equal(sameOrigin(req("http://jourvis.ai")), false);
  assert.equal(sameOrigin(req("http://127.0.0.1:3010", "127.0.0.1:3010"), true), true);
});
