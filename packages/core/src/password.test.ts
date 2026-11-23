import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  verifyPassword,
} from "./password.js";

describe("password hashing", () => {
  it("verifies a matching password", () => {
    const stored = hashPassword("secret-1");
    assert.equal(verifyPassword("secret-1", stored), true);
    assert.equal(verifyPassword("other", stored), false);
  });

  it("rejects missing or malformed hashes", () => {
    assert.equal(verifyPassword("x", null), false);
    assert.equal(verifyPassword("x", "no-salt"), false);
  });

  it("rejects oversized passwords without hashing", () => {
    const long = "a".repeat(MAX_PASSWORD_LENGTH + 1);
    assert.throws(() => hashPassword(long), /too long/);
    assert.equal(verifyPassword(long, hashPassword("ok")), false);
  });
});
