import Link from "next/link";
import { redirect } from "next/navigation";
import {
  can,
  coerceToJalaliPeriodKey,
  currentMonthPeriod,
  formatToman,
  invoiceStatusLabel,
  isUuid,
  issueInvoice,
  jalaliMonthLabel,
  listInvoices,
  listMembers,
  parseInvoiceStatus,
  toPersianDigits,
  voidInvoice,
} from "@eth/core";
import { FlashAlert } from "@/components/flash-alert";
import { resolveFlash } from "@/lib/flash";
import { InvoiceSearch } from "@/components/invoice-search";
import { requireActionCan } from "@/lib/action-guard";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";

async function issueAction(formData: FormData) {
  "use server";
  const user = await requireActionCan("invoice.manage");
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/admin/invoices");
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
  const user = await requireActionCan("invoice.manage");
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/admin/invoices");
  await voidInvoice(db(), user, id, "web");
  redirect("/admin/invoices?ok=void");
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    ok?: string;
    userId?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const user = await requireAdmin();

  const sp = await searchParams;
  const flash = resolveFlash(sp);
  const periodKey =
    sp.month === "all" ? undefined : sp.month || currentMonthPeriod().periodKey;
  const status = parseInvoiceStatus(sp.status);
  const userId = sp.userId?.trim() || "";
  const numberQ = sp.q?.trim() || "";
  const isAdmin = can(user, "invoice.manage");
  const [invoices, members] = await Promise.all([
    listInvoices(db(), user, periodKey, {
      userId: userId || undefined,
      status,
      number: numberQ || undefined,
    }),
    listMembers(db()),
  ]);
  const nameById = new Map(members.map((m) => [m.id, m.displayName]));
  const editors = members
    .filter((m) => m.isActive && m.role !== "client")
    .map((m) => ({ id: m.id, name: m.displayName }))
    .sort((a, b) => a.name.localeCompare(b.name, "fa"));
  const periodLabel = periodKey ? jalaliMonthLabel(periodKey) : "همهٔ ماه‌ها";

  return (
    <>
      <h1 className="hero-title">فاکتورها</h1>
      <p className="hero-sub">
        در حال نمایش: <strong>{periodLabel}</strong>
        {periodKey ? (
          <>
            {" — "}
            <span className="period-key" dir="ltr">
              {toPersianDigits(periodKey)}
            </span>
          </>
        ) : null}
        {userId ? ` — ${nameById.get(userId) ?? ""}` : ""}
        {status ? ` — ${invoiceStatusLabel(status)}` : ""}
        {numberQ ? ` — «${numberQ}»` : ""}
        {" — "}
        {toPersianDigits(invoices.length)} فاکتور
      </p>

      {flash && (
        <FlashAlert
          tone={flash.tone}
          title={flash.title}
          detail={flash.detail}
          clearKeys={flash.clearKeys}
        />
      )}

      <InvoiceSearch
        key={`${periodKey ?? "all"}|${userId}|${status ?? ""}|${numberQ}`}
        month={periodKey ?? ""}
        userId={userId}
        status={status ?? ""}
        q={numberQ}
        editors={editors}
      />
      {isAdmin && (
        <div className="board-item-actions invoice-toolbar">
          <Link
            className="btn-mini btn-mini-ok"
            href={`/admin/invoices/compose?month=${periodKey ?? currentMonthPeriod().periodKey}`}
          >
            <span className="material-symbols-outlined">fact_check</span>
            فاکتور شخصی‌سازی
          </Link>
        </div>
      )}

      <div className="panel" id="invoice-results">
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
                  <div
                    className="muted period-key"
                    style={{ fontSize: 11 }}
                    dir="ltr"
                  >
                    {toPersianDigits(coerceToJalaliPeriodKey(inv.periodKey))}
                  </div>
                </td>
                <td>{formatToman(inv.totalAmount)}</td>
                <td>{invoiceStatusLabel(inv.status)}</td>
                <td>
                  <div className="board-item-actions">
                    <Link className="btn-mini" href={`/admin/invoices/${inv.id}`}>
                      <span className="material-symbols-outlined">
                        visibility
                      </span>
                      مشاهده
                    </Link>
                    {isAdmin && inv.status === "draft" && (
                      <form action={issueAction}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button className="btn-mini btn-mini-ok" type="submit">
                          <span className="material-symbols-outlined">send</span>
                          صدور
                        </button>
                      </form>
                    )}
                    {can(user, "invoice.pay") && inv.status === "issued" && (
                      <Link
                        className="btn-mini btn-mini-ok"
                        href={`/admin/invoices/${inv.id}#payment`}
                      >
                        <span className="material-symbols-outlined">
                          receipt_long
                        </span>
                        فیش و تأیید
                      </Link>
                    )}
                    {isAdmin && inv.status !== "paid" && inv.status !== "void" && (
                      <form action={voidAction}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button className="btn-mini btn-mini-no" type="submit">
                          <span className="material-symbols-outlined">
                            block
                          </span>
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
          <div className="flash-alert flash-alert-info" style={{ marginTop: 12 }}>
            <span className="material-symbols-outlined flash-alert-icon">
              filter_alt_off
            </span>
            <div className="flash-alert-body">
              <div className="flash-alert-title">
                با این جستجو فاکتوری نیست
              </div>
              <p className="flash-alert-detail">
                ماه، ادیتور، وضعیت یا شماره را عوض کنید.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
