import Link from "next/link";
import {
  coerceToJalaliPeriodKey,
  formatToman,
  invoiceStatusLabel,
  jalaliMonthLabel,
  listClientProjectInvoices,
  toPersianDigits,
} from "@eth/core";
import { requireClientPortal } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function ClientInvoicesPage() {
  const user = await requireClientPortal();
  const rows = await listClientProjectInvoices(db(), user);

  return (
    <>
      <h1 className="hero-title">فاکتور پروژه‌ها</h1>
      <p className="hero-sub">
        فاکتورهایی که برای پروژه‌های شما صادر شده — {toPersianDigits(rows.length)} مورد
      </p>

      <div className="panel" id="invoice-results">
        <table className="table">
          <thead>
            <tr>
              <th>شماره</th>
              <th>دوره</th>
              <th>پروژه</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.invoice.id}>
                <td>
                  <Link href={`/client/invoices/${row.invoice.id}`}>
                    {row.invoice.number}
                  </Link>
                </td>
                <td>
                  {jalaliMonthLabel(row.invoice.periodKey)}
                  <div
                    className="muted period-key"
                    style={{ fontSize: 11 }}
                    dir="ltr"
                  >
                    {toPersianDigits(
                      coerceToJalaliPeriodKey(row.invoice.periodKey),
                    )}
                  </div>
                </td>
                <td>{row.projectNames.join("، ") || "—"}</td>
                <td>{formatToman(row.amount)}</td>
                <td>{invoiceStatusLabel(row.invoice.status)}</td>
                <td>
                  <Link
                    href={`/client/invoices/${row.invoice.id}`}
                    className="btn-mini"
                  >
                    <span className="material-symbols-outlined">visibility</span>
                    مشاهده
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flash-alert flash-alert-info" style={{ marginTop: 12 }}>
            <span className="material-symbols-outlined flash-alert-icon">
              receipt_long
            </span>
            <div className="flash-alert-body">
              <div className="flash-alert-title">فاکتور صادرشده‌ای نیست</div>
              <p className="flash-alert-detail">
                پس از صدور فاکتور برای کارهای پروژه‌های شما، اینجا نمایش داده می‌شود.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
