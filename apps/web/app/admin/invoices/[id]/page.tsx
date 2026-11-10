import { redirect, notFound } from "next/navigation";
import {
  englishMonthLabel,
  formatToman,
  getAgencySettings,
  getInvoiceDetail,
  toPersianDigits,
} from "@eth/core";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import Link from "next/link";

const STATUS_FA: Record<string, string> = {
  draft: "پیش‌نویس",
  issued: "صادر شده",
  paid: "پرداخت شده",
  void: "باطل",
};

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let detail;
  try {
    detail = await getInvoiceDetail(db(), user, id);
  } catch {
    notFound();
  }

  const agency = await getAgencySettings(db());
  const { invoice, lines, editor } = detail;

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: 32,
        fontFamily: "Vazirmatn, Tahoma, sans-serif",
        color: "#122",
        background: "#fff",
        minHeight: "100vh",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <p>
        <Link href="/admin/invoices">← بازگشت</Link>
      </p>
      {agency.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={agency.logoUrl} alt="" style={{ maxHeight: 48 }} />
      )}
      <h1 style={{ marginBottom: 4 }}>{agency.name}</h1>
      <div style={{ color: "#555", marginBottom: 24, fontSize: 14 }}>
        شماره فاکتور: <b>{invoice.number}</b>
        <br />
        دوره: {englishMonthLabel(invoice.periodKey)} (
        {toPersianDigits(invoice.periodKey)})
        <br />
        ادیتور: {editor?.displayName ?? "—"}
        <br />
        وضعیت: {STATUS_FA[invoice.status] ?? invoice.status}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["پروژه", "عنوان", "واحد", "فی", "مبلغ"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "right",
                  borderBottom: "1px solid #ddd",
                  padding: 8,
                  color: "#666",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id}>
              <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                {l.projectName ?? "—"}
              </td>
              <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                {l.description}
              </td>
              <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                {toPersianDigits(l.units)}
              </td>
              <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                {formatToman(l.unitPrice)}
              </td>
              <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                {formatToman(l.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 24, fontWeight: 700, fontSize: 18 }}>
        جمع کل: {formatToman(invoice.totalAmount)}
      </p>

      <style>{`@media print { a { display: none } }`}</style>
    </div>
  );
}
