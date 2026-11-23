import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  invoiceStatusLabel,
  projectStatusLabel,
  INVOICE_STATUS_OPTIONS,
} from "./labels.js";

describe("status labels", () => {
  it("maps known invoice statuses", () => {
    assert.equal(invoiceStatusLabel("draft"), "پیش‌نویس");
    assert.equal(invoiceStatusLabel("issued"), "صادر شده");
    assert.equal(invoiceStatusLabel("paid"), "پرداخت شده");
    assert.equal(invoiceStatusLabel("void"), "باطل");
  });

  it("keeps unknown invoice status as-is", () => {
    assert.equal(invoiceStatusLabel("unknown"), "unknown");
  });

  it("exposes all invoice filter options", () => {
    assert.deepEqual(
      INVOICE_STATUS_OPTIONS.map((o) => o.value),
      ["draft", "issued", "paid", "void"],
    );
  });

  it("maps known project statuses", () => {
    assert.equal(projectStatusLabel("open"), "باز");
    assert.equal(projectStatusLabel("closed"), "بسته");
    assert.equal(projectStatusLabel("other"), "other");
  });
});
