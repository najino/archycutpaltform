import Link from "next/link";
import {
  currentMonthPeriod,
  formatToman,
  listInvoices,
} from "@eth/core";
import { EditorShell } from "@/components/editor-shell";
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
      <p className="hero-sub">فاکتورهای ماهانه مربوط به خودتان.</p>

      <form className="form-grid" style={{ maxWidth: 280, marginBottom: 16 }}>
        <label>
          ماه
          <input name="month" defaultValue={periodKey} />
        </label>
        <button className="btn" type="submit">
          فیلتر
        </button>
      </form>

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
                <td>{inv.periodKey}</td>
                <td>{formatToman(inv.totalAmount)}</td>
                <td>{inv.status}</td>
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
