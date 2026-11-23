import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toWeekKey, weekKeyFromDueOrCreated } from "./week.js";

describe("iso week keys", () => {
  it("formats a known Thursday as ISO week", () => {
    // 2026-11-19 is Thursday of ISO week 47
    assert.equal(toWeekKey(new Date("2026-11-19T12:00:00Z")), "2026-W47");
  });

  it("prefers due date over createdAt", () => {
    assert.equal(
      weekKeyFromDueOrCreated("2026-11-19", new Date("2026-01-01T00:00:00Z")),
      "2026-W47",
    );
  });

  it("falls back to createdAt when due date is missing", () => {
    assert.equal(
      weekKeyFromDueOrCreated(null, new Date("2026-11-19T12:00:00Z")),
      "2026-W47",
    );
  });
});
