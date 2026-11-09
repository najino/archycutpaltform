import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeAmount, formatToman, toPersianDigits } from "./money.js";
import {
  monthPeriod,
  parsePeriodKey,
  previousMonthPeriod,
} from "./calendar.js";

describe("money math", () => {
  it("computes amount from units × price", () => {
    assert.equal(computeAmount(1, 1_500_000n), 1_500_000n);
    assert.equal(computeAmount(2, 1_500_000n), 3_000_000n);
    assert.equal(computeAmount(2.5, 1_000_000n), 2_500_000n);
  });

  it("formats toman with persian digits", () => {
    assert.equal(toPersianDigits("1500"), "۱۵۰۰");
    assert.match(formatToman(1_500_000n), /تومان/);
    assert.match(formatToman(1_500_000n), /۱/);
  });
});

describe("calendar periods", () => {
  it("builds gregorian month bounds", () => {
    const p = monthPeriod(2026, 11);
    assert.equal(p.periodKey, "2026-11");
    assert.equal(p.periodStart, "2026-11-01");
    assert.equal(p.periodEnd, "2026-11-30");
  });

  it("parses period key", () => {
    assert.equal(parsePeriodKey("2026-02").periodEnd, "2026-02-28");
  });

  it("previous month from fixed date", () => {
    // 2026-12-01 Tehran ≈ late Nov UTC; use noon UTC Dec 1
    const p = previousMonthPeriod(new Date("2026-12-01T12:00:00+03:30"));
    assert.equal(p.periodKey, "2026-11");
  });
});
