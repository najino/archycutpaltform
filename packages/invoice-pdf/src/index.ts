import {
  formatJalaliDate,
  formatToman,
  invoiceStatusLabel,
  jalaliMonthLabel,
  toPersianDigits,
} from "@eth/core";
import { htmlToPdf } from "./spawn-html-to-pdf.js";

export { htmlToPdf } from "./spawn-html-to-pdf.js";

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
  /** برچسب طرف حساب؛ پیش‌فرض «ادیتور» */
  partyLabel?: string;
  status: string;
  issuedAt?: Date | null;
  totalAmount: bigint;
  lines: InvoicePdfLine[];
  paymentReceipt?: string | null;
};

export type InvoicePdfSource = {
  agencyName: string;
  agencyLogoUrl?: string | null;
  invoice: {
    number: string;
    periodKey: string;
    status: string;
    issuedAt?: Date | null;
    totalAmount: bigint;
    paymentReceipt?: string | null;
  };
  lines: Array<{
    projectName?: string | null;
    description?: string | null;
    units: number;
    unitPrice: bigint;
    amount: bigint;
  }>;
  editorName: string;
  partyLabel?: string;
  totalAmount?: bigint;
};

export function toInvoicePdfInput(source: InvoicePdfSource): InvoicePdfInput {
  return {
    agencyName: source.agencyName,
    agencyLogoUrl: source.agencyLogoUrl,
    number: source.invoice.number,
    periodKey: source.invoice.periodKey,
    editorName: source.editorName,
    partyLabel: source.partyLabel,
    status: source.invoice.status,
    issuedAt: source.invoice.issuedAt,
    totalAmount: source.totalAmount ?? source.invoice.totalAmount,
    paymentReceipt: source.invoice.paymentReceipt,
    lines: source.lines.map((line) => ({
      projectName: line.projectName,
      description: line.description,
      units: Number(line.units),
      unitPrice: line.unitPrice,
      amount: line.amount,
    })),
  };
}

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
    ? formatJalaliDate(input.issuedAt)
    : "—";
  const logoSrc = safeLogoSrc(input.agencyLogoUrl);

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
  ${logoSrc ? `<img class="logo" src="${escapeHtml(logoSrc)}" />` : ""}
  <h1>${escapeHtml(input.agencyName)}</h1>
  <div class="meta">
    شماره فاکتور: <b>${escapeHtml(input.number)}</b><br/>
    دوره: ${escapeHtml(jalaliMonthLabel(input.periodKey))} (${toPersianDigits(input.periodKey)})<br/>
    ${escapeHtml(input.partyLabel ?? "ادیتور")}: ${escapeHtml(input.editorName)}<br/>
    تاریخ صدور: ${issueDate}<br/>
    وضعیت: <span class="status">${escapeHtml(invoiceStatusLabel(input.status))}</span>
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
  ${
    input.paymentReceipt?.trim()
      ? `<div style="margin-top:18px;padding:12px;border:1px solid #ddd;border-radius:8px;background:#fafafa;font-size:12px">
    <b>فیش پرداختی:</b>
    <pre style="margin:8px 0 0;white-space:pre-wrap;font-family:inherit">${escapeHtml(input.paymentReceipt.trim())}</pre>
  </div>`
      : ""
  }
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeLogoSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {
    /* آدرس نامعتبر */
  }
  return null;
}

export async function renderInvoicePdf(
  input: InvoicePdfInput,
): Promise<Buffer> {
  return htmlToPdf(buildInvoiceHtml(input));
}
