import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { consumeRateLimit, type RateLimitStore } from "./rate-limit.js";

describe("rate limit", () => {
  it("allows up to the limit inside the window", () => {
    const store: RateLimitStore = new Map();
    const now = 1_000_000;
    assert.equal(consumeRateLimit(store, "a", 2, 1000, now).ok, true);
    assert.equal(consumeRateLimit(store, "a", 2, 1000, now + 10).ok, true);
    const blocked = consumeRateLimit(store, "a", 2, 1000, now + 20);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.retryAfterSec, 1);
  });

  it("resets after the window", () => {
    const store: RateLimitStore = new Map();
    const now = 1_000_000;
    consumeRateLimit(store, "a", 1, 500, now);
    assert.equal(consumeRateLimit(store, "a", 1, 500, now + 10).ok, false);
    assert.equal(consumeRateLimit(store, "a", 1, 500, now + 500).ok, true);
  });

  it("isolates keys", () => {
    const store: RateLimitStore = new Map();
    consumeRateLimit(store, "a", 1, 1000, 0);
    assert.equal(consumeRateLimit(store, "b", 1, 1000, 0).ok, true);
  });
});
