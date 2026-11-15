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
import { FlashAlert } from "@/components/flash-alert";
import { resolveFlash } from "@/lib/flash";
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
  redirect(`/admin/invoices/${id}?ok=receipt#payment`);
}

async function finalizePaymentAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const id = String(formData.get("id") ?? "");
  const paymentReceipt = String(formData.get("paymentReceipt") ?? "");
  await markInvoicePaid(db(), user, id, "web", paymentReceipt || null);
  redirect(`/admin/invoices/${id}?ok=paid#payment`);
}

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const flash = resolveFlash(await searchParams);

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
  const isFinal = invoice.status === "paid";
  const canEditReceipt =
    (canPay || canManage) &&
    invoice.status !== "void" &&
    invoice.status !== "paid";

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

        {flash && (
          <FlashAlert
            tone={flash.tone}
            title={flash.title}
            detail={flash.detail}
            clearKeys={flash.clearKeys}
          />
        )}

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
              ابتدا فیش را ذخیره و در صورت نیاز ویرایش کنید؛ بعد با «تأیید نهایی»
              پرداخت قفل می‌شود و دیگر قابل تغییر نیست.
            </p>

            {isFinal && (
              <div className="info-banner" style={{ marginBottom: 12 }}>
                <span className="material-symbols-outlined">verified</span>
                <div>
                  <div className="info-banner-title">تأیید نهایی انجام شد</div>
                  <p className="muted">
                    فیش و وضعیت پرداخت قفل است
                    {invoice.paidAt
                      ? ` · ${formatJalaliDateTime(invoice.paidAt)}`
                      : ""}
                    .
                  </p>
                </div>
              </div>
            )}

            {invoice.paymentReceipt && (
              <div className="payment-receipt-box">
                <div className="muted text-11">
                  {isFinal ? "فیش نهایی" : "پیش‌نویس فیش"}
                </div>
                <pre className="payment-receipt-text">{invoice.paymentReceipt}</pre>
              </div>
            )}

            {canEditReceipt ? (
              <form className="form-grid">
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
                <div className="board-item-actions">
                  <button
                    className="btn-mini"
                    type="submit"
                    formAction={saveReceiptAction}
                  >
                    ذخیره فیش
                  </button>
                  {invoice.status === "issued" && canPay && (
                    <button
                      className="btn-mini btn-mini-ok"
                      type="submit"
                      formAction={finalizePaymentAction}
                    >
                      <span className="material-symbols-outlined">done_all</span>
                      تأیید نهایی
                    </button>
                  )}
                </div>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  ذخیره فقط متن فیش را نگه می‌دارد. تأیید نهایی وضعیت را
                  «پرداخت شده» می‌کند و ویرایش را می‌بندد.
                </p>
              </form>
            ) : (
              !invoice.paymentReceipt && (
                <p className="muted" style={{ marginBottom: 0 }}>
                  فیشی ثبت نشده است.
                </p>
              )
            )}
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
            <b>فیش پرداختی{isFinal ? " (نهایی)" : ""}:</b>
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
