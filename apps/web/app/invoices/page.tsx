import Link from "next/link";
import {
  coerceToJalaliPeriodKey,
  currentMonthPeriod,
  formatToman,
  jalaliMonthLabel,
  listInvoices,
  toPersianDigits,
} from "@eth/core";
import { EditorShell } from "@/components/editor-shell";
import { JalaliMonthInput } from "@/components/jalali-month-input";
import { requireEditorPortal } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function EditorInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireEditorPortal();
  const sp = await searchParams;
  const periodKey = sp.month || currentMonthPeriod().periodKey;
  const invoices = await listInvoices(db(), user, periodKey);

  return (
    <EditorShell user={user}>
      <h1 className="hero-title">فاکتورهای من</h1>
      <p className="hero-sub">
        در حال نمایش: <strong>{jalaliMonthLabel(periodKey)}</strong> —{" "}
        {invoices.length} فاکتور. پیش‌نویس‌ها تا صدور ادمین اینجا دیده نمی‌شوند.
      </p>

      <JalaliMonthInput
        key={periodKey}
        defaultValue={periodKey}
        submitLabel="فیلتر"
      />

      <div className="panel" id="invoice-results">
        <table className="table">
          <thead>
            <tr>
              <th>شماره</th>
              <th>دوره</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <Link href={`/invoices/${inv.id}`}>{inv.number}</Link>
                </td>
                <td>
                  {jalaliMonthLabel(inv.periodKey)}
                  <div className="muted period-key" style={{ fontSize: 11 }} dir="ltr">
                    {toPersianDigits(coerceToJalaliPeriodKey(inv.periodKey))}
                  </div>
                </td>
                <td>{formatToman(inv.totalAmount)}</td>
                <td>
                  {inv.status === "issued"
                    ? "صادر شده"
                    : inv.status === "paid"
                      ? "پرداخت شده"
                      : inv.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <div className="flash-alert flash-alert-info" style={{ marginTop: 12 }}>
            <span className="material-symbols-outlined flash-alert-icon">
              filter_alt_off
            </span>
            <div className="flash-alert-body">
              <div className="flash-alert-title">
                برای {jalaliMonthLabel(periodKey)} فاکتوری نیست
              </div>
              <p className="flash-alert-detail">
                فیلتر اعمال شد — ماه دیگری را امتحان کنید.
              </p>
            </div>
          </div>
        )}
      </div>
    </EditorShell>
  );
}
