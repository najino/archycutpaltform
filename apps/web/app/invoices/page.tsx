import Link from "next/link";
import {
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
        فاکتورهای صادرشدهٔ ماه شمسی — {jalaliMonthLabel(periodKey)}. پیش‌نویس‌ها
        تا صدور ادمین اینجا دیده نمی‌شوند.
      </p>

      <JalaliMonthInput
        key={periodKey}
        defaultValue={periodKey}
        submitLabel="فیلتر"
      />

      <div className="panel">
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
                  <div className="muted" style={{ fontSize: 11 }}>
                    {toPersianDigits(inv.periodKey)}
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
          <p className="muted">فاکتوری برای این ماه نیست.</p>
        )}
      </div>
    </EditorShell>
  );
}
