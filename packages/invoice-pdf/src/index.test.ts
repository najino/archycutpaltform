import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInvoiceHtml, toInvoicePdfInput } from "./index.js";

function sampleHtml(
  over: Partial<Parameters<typeof buildInvoiceHtml>[0]> = {},
) {
  return buildInvoiceHtml({
    agencyName: "آرشی کات",
    number: "INV-1405-08-003",
    periodKey: "1405-08",
    editorName: "Ali",
    status: "issued",
    totalAmount: 1_400_000n,
    lines: [
      {
        projectName: "رستا",
        description: "ریلز",
        units: 2,
        unitPrice: 700_000n,
        amount: 1_400_000n,
      },
    ],
    ...over,
  });
}

describe("toInvoicePdfInput", () => {
  it("maps invoice fields and allows a client total override", () => {
    const input = toInvoicePdfInput({
      agencyName: "آرشی",
      agencyLogoUrl: "https://cdn.example/logo.png",
      invoice: {
        number: "INV-1",
        periodKey: "1405-08",
        status: "issued",
        issuedAt: new Date("2026-11-01T00:00:00Z"),
        totalAmount: 2_000_000n,
        paymentReceipt: "رسید",
      },
      lines: [
        {
          projectName: "A",
          description: "کار",
          units: 2,
          unitPrice: 500_000n,
          amount: 1_000_000n,
        },
      ],
      editorName: "کارفرما",
      partyLabel: "کارفرما",
      totalAmount: 1_000_000n,
    });
    assert.equal(input.totalAmount, 1_000_000n);
    assert.equal(input.partyLabel, "کارفرما");
    assert.equal(input.lines[0]?.units, 2);
    assert.equal(input.number, "INV-1");
  });
});

describe("buildInvoiceHtml", () => {
  it("escapes html in names and receipt", () => {
    const html = sampleHtml({
      agencyName: `<img src=x onerror=alert(1)>`,
      editorName: `Ali</b>`,
      paymentReceipt: `<script>alert(1)</script>`,
    });
    assert.equal(html.includes("<script>"), false);
    assert.match(html, /&lt;img src=x/);
    assert.match(html, /&lt;script&gt;/);
  });

  it("drops javascript and svg data logos", () => {
    const js = sampleHtml({ agencyLogoUrl: "javascript:alert(1)" });
    assert.equal(js.includes("<img"), false);
    const svg = sampleHtml({
      agencyLogoUrl: "data:image/svg+xml;base64,PHN2Zz4=",
    });
    assert.equal(svg.includes("<img"), false);
  });

  it("keeps https and raster data urls", () => {
    const https = sampleHtml({
      agencyLogoUrl: "https://cdn.example/logo.png",
    });
    assert.match(https, /<img class="logo" src="https:\/\/cdn.example\/logo.png"/);
    const png = sampleHtml({
      agencyLogoUrl: "data:image/png;base64,aaa",
    });
    assert.match(png, /data:image\/png;base64,aaa/);
  });

  it("renders client party label and issued status in persian", () => {
    const html = sampleHtml({ partyLabel: "کارفرما", status: "issued" });
    assert.match(html, /کارفرما/);
    assert.match(html, /صادر شده/);
  });
});
