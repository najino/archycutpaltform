import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatToman,
  getAgencySettings,
  getInvoiceDetail,
  invoiceStatusLabel,
  jalaliMonthLabel,
  toPersianDigits,
} from "@eth/core";
import { InvoicePdfActions } from "@/components/invoice-pdf-actions";
import { requireClientPortal } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function ClientInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClientPortal();
  const { id } = await params;

  let detail;
  try {
    detail = await getInvoiceDetail(db(), user, id);
  } catch {
    notFound();
  }

  const agency = await getAgencySettings(db());
  const { invoice, lines, clientAmount } = detail;
  const total = clientAmount ?? invoice.totalAmount;

  return (
    <>
      <p>
        <Link href="/client/invoices" className="muted">
          ← بازگشت به فاکتورها
        </Link>
      </p>
      {agency.logoUrl ? (
        <img
          src={agency.logoUrl}
          alt=""
          style={{ maxHeight: 48, marginBottom: 8 }}
        />
      ) : null}
      <h1 className="hero-title">{invoice.number}</h1>
      <p className="hero-sub">
        {agency.name} · {jalaliMonthLabel(invoice.periodKey)} ·{" "}
        {invoiceStatusLabel(invoice.status)} · {formatToman(total)}
      </p>

      <InvoicePdfActions invoiceId={invoice.id} number={invoice.number} />

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>شرح</th>
              <th>پروژه</th>
              <th>واحد</th>
              <th>فی</th>
              <th>مبلغ</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td>{line.description || "—"}</td>
                <td>{line.projectName || "—"}</td>
                <td>{toPersianDigits(line.units)}</td>
                <td>{formatToman(line.unitPrice)}</td>
                <td>{formatToman(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ textAlign: "left", fontWeight: 700, marginTop: 16 }}>
          جمع سهم پروژه‌های شما: {formatToman(total)}
        </p>
      </div>
    </>
  );
}
