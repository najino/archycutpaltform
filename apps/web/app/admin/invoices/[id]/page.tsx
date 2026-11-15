import { redirect, notFound } from "next/navigation";
import {
  can,
  jalaliMonthLabel,
  formatJalaliDateTime,
  formatToman,
  getAgencySettings,
  getInvoiceDetail,
  markInvoicePaid,
  setInvoicePaymentReceipt,
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

async function saveReceiptAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const id = String(formData.get("id") ?? "");
  const paymentReceipt = String(formData.get("paymentReceipt") ?? "");
  await setInvoicePaymentReceipt(db(), user, id, paymentReceipt, "web");
  redirect(`/admin/invoices/${id}#payment`);
}

async function payWithReceiptAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const id = String(formData.get("id") ?? "");
  const paymentReceipt = String(formData.get("paymentReceipt") ?? "");
  await markInvoicePaid(db(), user, id, "web", paymentReceipt);
  redirect(`/admin/invoices/${id}#payment`);
}

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
  const canPay = can(user, "invoice.pay");
  const canManage = can(user, "invoice.manage");

  return (
    <>
      <div className="invoice-admin-bar no-print">
        <p>
          <Link href="/admin/invoices" className="muted">
            ← بازگشت به فاکتورها
          </Link>
        </p>
        <h1 className="hero-title" style={{ fontSize: 22 }}>
          {invoice.number}
        </h1>
        <p className="hero-sub">
          {editor?.displayName ?? "—"} · {jalaliMonthLabel(invoice.periodKey)} ·{" "}
          {STATUS_FA[invoice.status] ?? invoice.status}
        </p>

        {(canPay || canManage) && invoice.status !== "void" && (
          <div className="panel" id="payment">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>
              <span
                className="material-symbols-outlined"
                style={{
                  verticalAlign: "middle",
                  marginLeft: 6,
                  color: "var(--primary)",
                }}
              >
                receipt_long
              </span>
              فیش پرداختی (متنی)
            </h2>
            <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
              کد پیگیری کارت‌به‌کارت، شماره تراکنش، یا توضیح پرداخت را اینجا
              بنویسید. برای ادیتور در پنل فاکتور قابل مشاهده است.
            </p>

            {invoice.paymentReceipt && (
              <div className="payment-receipt-box">
                <div className="muted text-11">فیش ثبت‌شده</div>
                <pre className="payment-receipt-text">{invoice.paymentReceipt}</pre>
                {invoice.paidAt && (
                  <div className="muted text-11">
                    پرداخت: {formatJalaliDateTime(invoice.paidAt)}
                  </div>
                )}
              </div>
            )}

            <form
              action={
                invoice.status === "issued" && canPay
                  ? payWithReceiptAction
                  : saveReceiptAction
              }
              className="form-grid"
            >
              <input type="hidden" name="id" value={invoice.id} />
              <label>
                متن فیش / کد پیگیری
                <textarea
                  name="paymentReceipt"
                  rows={4}
                  required
                  defaultValue={invoice.paymentReceipt ?? ""}
                  placeholder="مثال: کارت‌به‌کارت ۱۴۰۴/۰۸/۲۰ — پیگیری ۱۲۳۴۵۶ — مبلغ …"
                />
              </label>
              <div className="actions">
                {invoice.status === "issued" && canPay ? (
                  <button className="btn primary" type="submit">
                    ثبت فیش و علامت پرداخت‌شده
                  </button>
                ) : (
                  <button className="btn primary" type="submit">
                    ذخیره فیش پرداختی
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      <div
        dir="rtl"
        className="invoice-print-sheet"
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: 32,
          fontFamily: "Vazirmatn, Tahoma, sans-serif",
          color: "#122",
          background: "#fff",
          minHeight: "40vh",
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        {agency.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agency.logoUrl} alt="" style={{ maxHeight: 48 }} />
        )}
        <h1 style={{ marginBottom: 4 }}>{agency.name}</h1>
        <div style={{ color: "#555", marginBottom: 24, fontSize: 14 }}>
          شماره فاکتور: <b>{invoice.number}</b>
          <br />
          دوره: {jalaliMonthLabel(invoice.periodKey)} (
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

        {invoice.paymentReceipt && (
          <div
            style={{
              marginTop: 20,
              padding: 12,
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fafafa",
              fontSize: 13,
            }}
          >
            <b>فیش پرداختی:</b>
            <pre
              style={{
                margin: "8px 0 0",
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
            >
              {invoice.paymentReceipt}
            </pre>
          </div>
        )}

        <style>{`@media print { .no-print { display: none !important } }`}</style>
      </div>
    </>
  );
}
