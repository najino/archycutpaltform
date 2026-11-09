import { englishMonthLabel, formatToman, toPersianDigits } from "@eth/core";

export type InvoicePdfLine = {
  projectName?: string | null;
  description?: string | null;
  units: number;
  unitPrice: bigint;
  amount: bigint;
};

export type InvoicePdfInput = {
  agencyName: string;
  agencyLogoUrl?: string | null;
  number: string;
  periodKey: string;
  editorName: string;
  status: string;
  issuedAt?: Date | null;
  totalAmount: bigint;
  lines: InvoicePdfLine[];
};

const STATUS_FA: Record<string, string> = {
  draft: "پیش‌نویس",
  issued: "صادر شده",
  paid: "پرداخت شده",
  void: "باطل",
};

export function buildInvoiceHtml(input: InvoicePdfInput): string {
  const rows = input.lines
    .map(
      (l) => `
      <tr>
        <td>${escapeHtml(l.projectName ?? "—")}</td>
        <td>${escapeHtml(l.description ?? "—")}</td>
        <td>${toPersianDigits(l.units)}</td>
        <td>${formatToman(l.unitPrice)}</td>
        <td>${formatToman(l.amount)}</td>
      </tr>`,
    )
    .join("");

  const issueDate = input.issuedAt
    ? toPersianDigits(input.issuedAt.toISOString().slice(0, 10))
    : "—";

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: Vazirmatn, Tahoma, sans-serif; color: #122; margin: 32px; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .meta { color: #555; margin-bottom: 24px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; text-align: right; font-size: 12px; }
    th { color: #666; font-weight: 600; }
    .total { margin-top: 20px; font-size: 16px; font-weight: 700; }
    .logo { max-height: 48px; margin-bottom: 12px; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #eef6f0; }
  </style>
</head>
<body>
  ${input.agencyLogoUrl ? `<img class="logo" src="${escapeHtml(input.agencyLogoUrl)}" />` : ""}
  <h1>${escapeHtml(input.agencyName)}</h1>
  <div class="meta">
    شماره فاکتور: <b>${escapeHtml(input.number)}</b><br/>
    دوره: ${escapeHtml(englishMonthLabel(input.periodKey))} (${toPersianDigits(input.periodKey)})<br/>
    ادیتور: ${escapeHtml(input.editorName)}<br/>
    تاریخ صدور: ${issueDate}<br/>
    وضعیت: <span class="status">${STATUS_FA[input.status] ?? input.status}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>پروژه</th>
        <th>عنوان</th>
        <th>واحد</th>
        <th>فی</th>
        <th>مبلغ</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">جمع کل: ${formatToman(input.totalAmount)}</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Generate PDF buffer via Playwright Chromium. Regeneratable anytime. */
export async function renderInvoicePdf(
  input: InvoicePdfInput,
): Promise<Buffer> {
  const html = buildInvoiceHtml(input);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
