import Link from "next/link";
import { redirect } from "next/navigation";
import {
  can,
  currentMonthPeriod,
  formatToman,
  generateInvoicesForPeriod,
  issueInvoice,
  listInvoices,
  listMembers,
  markInvoicePaid,
  parsePeriodKey,
  previousMonthPeriod,
  voidInvoice,
} from "@eth/core";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

async function generateAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || !can(user, "invoice.manage")) redirect("/login?portal=admin");
  const periodKey =
    String(formData.get("periodKey") ?? "") || previousMonthPeriod().periodKey;
  await generateInvoicesForPeriod(db(), user, parsePeriodKey(periodKey), "web");
  redirect(`/admin/invoices?month=${periodKey}`);
}

async function issueAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const id = String(formData.get("id") ?? "");
  await issueInvoice(db(), user, id, "web");
  redirect("/admin/invoices");
}

async function payAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const id = String(formData.get("id") ?? "");
  await markInvoicePaid(db(), user, id, "web");
  redirect("/admin/invoices");
}

async function voidAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const id = String(formData.get("id") ?? "");
  await voidInvoice(db(), user, id, "web");
  redirect("/admin/invoices");
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");

  const sp = await searchParams;
  const periodKey = sp.month || currentMonthPeriod().periodKey;
  const isAdmin = can(user, "invoice.manage");
  const [invoices, members] = await Promise.all([
    listInvoices(db(), user, periodKey),
    listMembers(db()),
  ]);
  const nameById = new Map(members.map((m) => [m.id, m.displayName]));

  return (
    <>
      <h1 className="hero-title">فاکتورها</h1>
      <p className="hero-sub">فاکتور ماهانه میلادی برای هر ادیتور.</p>

      <form className="form-grid" style={{ maxWidth: 280, marginBottom: 16 }}>
        <label>
          ماه
          <input name="month" defaultValue={periodKey} />
        </label>
        <button className="btn" type="submit">
          فیلتر
        </button>
      </form>

      {isAdmin && (
        <form action={generateAction} className="actions" style={{ marginBottom: 16 }}>
          <input type="hidden" name="periodKey" value={periodKey} />
          <button className="btn primary" type="submit">
            تولید / به‌روزرسانی پیش‌نویس‌های {periodKey}
          </button>
        </form>
      )}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>شماره</th>
              <th>ادیتور</th>
              <th>دوره</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <Link href={`/admin/invoices/${inv.id}`}>{inv.number}</Link>
                </td>
                <td>{nameById.get(inv.userId) ?? inv.userId}</td>
                <td>{inv.periodKey}</td>
                <td>{formatToman(inv.totalAmount)}</td>
                <td>{inv.status}</td>
                <td>
                  <div className="actions">
                    {isAdmin && inv.status === "draft" && (
                      <form action={issueAction}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button className="btn" type="submit">
                          Issue
                        </button>
                      </form>
                    )}
                    {can(user, "invoice.pay") && inv.status === "issued" && (
                      <form action={payAction}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button className="btn primary" type="submit">
                          Mark paid
                        </button>
                      </form>
                    )}
                    {isAdmin && inv.status !== "paid" && inv.status !== "void" && (
                      <form action={voidAction}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button className="btn danger" type="submit">
                          Void
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <p className="muted">فاکتوری برای این ماه نیست.</p>
        )}
      </div>
    </>
  );
}
