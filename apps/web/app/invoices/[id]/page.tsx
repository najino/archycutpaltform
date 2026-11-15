import { redirect, notFound } from "next/navigation";
import {
  jalaliMonthLabel,
  formatJalaliDateTime,
  formatToman,
  getAgencySettings,
  getInvoiceDetail,
  setInvoicePaymentReceipt,
  toPersianDigits,
} from "@eth/core";
import { EditorShell } from "@/components/editor-shell";
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
  if (!user) redirect("/login?portal=editor");
  const id = String(formData.get("id") ?? "");
  const paymentReceipt = String(formData.get("paymentReceipt") ?? "");
  await setInvoicePaymentReceipt(db(), user, id, paymentReceipt, "web");
  redirect(`/invoices/${id}?ok=receipt#payment`);
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
  const isMine = invoice.userId === user.id;
  const isFinal = invoice.status === "paid";
  /** بعد از تأیید نهایی، ویرایش برای ادیتور بسته است */
  const canEditReceipt = isMine && invoice.status === "issued";

  return (
    <EditorShell user={user}>
      <p>
        <Link href="/invoices" className="muted">
          ← بازگشت
        </Link>
      </p>
      <h1 className="hero-title">{invoice.number}</h1>
      <p className="hero-sub">
        {jalaliMonthLabel(invoice.periodKey)} ·{" "}
        {STATUS_FA[invoice.status] ?? invoice.status} ·{" "}
        {formatToman(invoice.totalAmount)}
      </p>

      {flash && (
        <FlashAlert
          tone={flash.tone}
          title={flash.title}
          detail={flash.detail}
          clearKeys={flash.clearKeys}
        />
      )}

      <div className="panel">
        <div className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
          {agency.name}
          <br />
          ادیتور: {editor?.displayName ?? "—"}
          {invoice.paidAt && (
            <>
              <br />
              تاریخ پرداخت: {formatJalaliDateTime(invoice.paidAt)}
            </>
          )}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>پروژه</th>
              <th>عنوان</th>
              <th>واحد</th>
              <th>فی</th>
              <th>مبلغ</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td>{l.projectName ?? "—"}</td>
                <td>{l.description}</td>
                <td>{toPersianDigits(l.units)}</td>
                <td>{formatToman(l.unitPrice)}</td>
                <td>{formatToman(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ marginTop: 16, fontWeight: 700 }}>
          جمع کل: {formatToman(invoice.totalAmount)}
        </p>
      </div>

      <div className="panel" id="payment" style={{ marginTop: 16 }}>
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
          فیش پرداختی
        </h2>

        {isFinal && (
          <div className="info-banner" style={{ marginBottom: 12 }}>
            <span className="material-symbols-outlined">verified</span>
            <div>
              <div className="info-banner-title">پرداخت تأیید نهایی شده</div>
              <p className="muted">
                فیش قفل است و دیگر قابل ویرایش نیست
                {invoice.paidAt
                  ? ` · ${formatJalaliDateTime(invoice.paidAt)}`
                  : ""}
                .
              </p>
            </div>
          </div>
        )}

        {invoice.paymentReceipt ? (
          <div className="payment-receipt-box">
            <div className="muted text-11">
              {isFinal ? "فیش نهایی" : "پیش‌نویس فیش (قابل ویرایش)"}
            </div>
            <pre className="payment-receipt-text">{invoice.paymentReceipt}</pre>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 0 }}>
            هنوز فیش پرداختی ثبت نشده است.
          </p>
        )}

        {canEditReceipt && (
          <form
            action={saveReceiptAction}
            className="form-grid"
            style={{ marginTop: 12 }}
          >
            <input type="hidden" name="id" value={invoice.id} />
            <label>
              ثبت / ویرایش فیش (متنی)
              <textarea
                name="paymentReceipt"
                rows={4}
                required
                defaultValue={invoice.paymentReceipt ?? ""}
                placeholder="کد پیگیری، شماره کارت، یا توضیح دریافت وجه…"
              />
            </label>
            <button className="btn" type="submit">
              ذخیره (قابل ویرایش)
            </button>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              تا قبل از تأیید نهایی ادمین می‌توانید متن فیش را عوض کنید.
            </p>
          </form>
        )}
      </div>
    </EditorShell>
  );
}
