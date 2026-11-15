import Link from "next/link";
import { redirect } from "next/navigation";
import {
  can,
  currentMonthPeriod,
  formatToman,
  generateInvoicesForPeriod,
  issueInvoice,
  jalaliMonthLabel,
  listInvoices,
  listMembers,
  parsePeriodKey,
  previousMonthPeriod,
  toPersianDigits,
  voidInvoice,
} from "@eth/core";
import { FlashAlert, resolveFlash } from "@/components/flash-alert";
import { JalaliMonthInput } from "@/components/jalali-month-input";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

async function generateAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || !can(user, "invoice.manage")) redirect("/login?portal=admin");
  const periodKey =
    String(formData.get("periodKey") ?? "") || previousMonthPeriod().periodKey;
  await generateInvoicesForPeriod(db(), user, parsePeriodKey(periodKey), "web");
  redirect(`/admin/invoices?month=${periodKey}&ok=invoice`);
}

async function issueAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const id = String(formData.get("id") ?? "");
  const inv = await issueInvoice(db(), user, id, "web");
  try {
    const { notifyEditorInvoiceIssued } = await import("@/lib/telegram-bot");
    const members = await listMembers(db());
    const editor = members.find((m) => m.id === inv.userId);
    const base =
      process.env.WEB_BASE_URL?.replace(/\/$/, "") || "http://localhost:3010";
    if (editor?.telegramId) {
      await notifyEditorInvoiceIssued({
        telegramId: editor.telegramId,
        invoiceNumber: inv.number,
        periodLabel: jalaliMonthLabel(inv.periodKey),
        totalLabel: formatToman(inv.totalAmount),
        webUrl: `${base}/invoices/${inv.id}`,
      });
    }
  } catch (err) {
    console.error("issue notify failed:", err);
  }
  redirect(`/admin/invoices?month=${inv.periodKey}&ok=invoice`);
}

async function voidAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const id = String(formData.get("id") ?? "");
  await voidInvoice(db(), user, id, "web");
  redirect("/admin/invoices?ok=void");
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; ok?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");

  const sp = await searchParams;
  const flash = resolveFlash(sp);
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
      <p className="hero-sub">
        فاکتور ماهانه شمسی برای هر ادیتور — {jalaliMonthLabel(periodKey)}.
      </p>

      {flash && (
        <FlashAlert
          tone={flash.tone}
          title={flash.title}
          detail={flash.detail}
          clearKeys={flash.clearKeys}
        />
      )}

      <JalaliMonthInput defaultValue={periodKey} submitLabel="فیلتر" />

      {isAdmin && (
        <div className="actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <Link className="btn primary" href={`/admin/invoices/compose?month=${periodKey}`}>
            <span className="material-symbols-outlined icon-18">fact_check</span>
            فاکتور شخصی‌سازی (تیک پروژه‌ها)
          </Link>
          <form action={generateAction}>
            <input type="hidden" name="periodKey" value={periodKey} />
            <button className="btn" type="submit">
              تولید خودکار همهٔ پیش‌نویس‌های {jalaliMonthLabel(periodKey)}
            </button>
          </form>
        </div>
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
                <td>
                  {jalaliMonthLabel(inv.periodKey)}
                  <div className="muted" style={{ fontSize: 11 }}>
                    {toPersianDigits(inv.periodKey)}
                  </div>
                </td>
                <td>{formatToman(inv.totalAmount)}</td>
                <td>
                  {inv.status === "draft"
                    ? "پیش‌نویس"
                    : inv.status === "issued"
                      ? "صادر شده"
                      : inv.status === "paid"
                        ? "پرداخت شده"
                        : inv.status === "void"
                          ? "باطل"
                          : inv.status}
                </td>
                <td>
                  <div className="actions">
                    {isAdmin && inv.status === "draft" && (
                      <form action={issueAction}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button className="btn" type="submit">
                          صدور به پنل
                        </button>
                      </form>
                    )}
                    {can(user, "invoice.pay") && inv.status === "issued" && (
                      <Link
                        className="btn primary"
                        href={`/admin/invoices/${inv.id}#payment`}
                      >
                        فیش و تأیید نهایی
                      </Link>
                    )}
                    {isAdmin && inv.status !== "paid" && inv.status !== "void" && (
                      <form action={voidAction}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button className="btn danger" type="submit">
                          ابطال
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
