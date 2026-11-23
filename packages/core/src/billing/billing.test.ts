import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseInvoiceStatus } from "./billing.js";
import { computeAmount, formatToman, toPersianDigits } from "../shared/money.js";
import {
  formatJalaliDate,
  monthPeriod,
  parsePeriodKey,
  previousMonthPeriod,
  toGregorian,
  toJalali,
} from "../shared/calendar.js";

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

describe("jalali calendar periods", () => {
  it("converts known Gregorian↔Jalali anchors", () => {
    // 2026-03-21 ≈ 1405-01-01
    const j = toJalali(2026, 3, 21);
    assert.equal(j.jy, 1405);
    assert.equal(j.jm, 1);
    assert.equal(j.jd, 1);
    const g = toGregorian(1405, 1, 1);
    assert.equal(g.gy, 2026);
    assert.equal(g.gm, 3);
    assert.equal(g.gd, 21);
  });

  it("builds jalali month bounds as gregorian ISO", () => {
    const p = monthPeriod(1404, 8);
    assert.equal(p.periodKey, "1404-08");
    // آبان ۱۴۰۴ starts around 2025-10-23
    assert.match(p.periodStart, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(p.periodEnd, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(p.periodStart < p.periodEnd);
  });

  it("parses jalali period key", () => {
    const p = parsePeriodKey("1404-12");
    assert.equal(p.periodKey, "1404-12");
  });

  it("previous jalali month from fixed date", () => {
    // 1404-09-10 ≈ mid Azar → previous = Aban 1404
    const g = toGregorian(1404, 9, 10);
    const p = previousMonthPeriod(
      new Date(`${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}T12:00:00+03:30`),
    );
    assert.equal(p.periodKey, "1404-08");
  });

  it("formats iso date as jalali", () => {
    assert.equal(formatJalaliDate("2026-03-21", { persianDigits: false }), "1405/01/01");
  });
});

describe("invoice status filter", () => {
  it("accepts known statuses", () => {
    assert.equal(parseInvoiceStatus("draft"), "draft");
    assert.equal(parseInvoiceStatus("issued"), "issued");
    assert.equal(parseInvoiceStatus("paid"), "paid");
    assert.equal(parseInvoiceStatus("void"), "void");
  });

  it("ignores empty or unknown values", () => {
    assert.equal(parseInvoiceStatus(undefined), undefined);
    assert.equal(parseInvoiceStatus(""), undefined);
    assert.equal(parseInvoiceStatus("issued "), undefined);
    assert.equal(parseInvoiceStatus("unknown"), undefined);
  });
});
