import { test } from "node:test";
import assert from "node:assert/strict";
import { safeAuthNext } from "../lib/auth-redirect.ts";
test("sign-in resumes allowed invitations without permitting open redirects", () => {
  for (const value of [
    undefined,
    "//example.com",
    "https://example.com",
    "/suppliers/../../other",
    "/suppliers?redirect=https://example.com",
  ])
    assert.equal(safeAuthNext(value), "/command-center");
  assert.equal(safeAuthNext("/suppliers"), "/suppliers");
  const invite = "/invite/11111111-1111-4111-8111-111111111111";
  assert.equal(safeAuthNext(invite), invite);
});
