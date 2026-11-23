import Link from "next/link";
import { redirect } from "next/navigation";
import {
  can,
  currentMonthPeriod,
  isJalaliPeriodKey,
  isUuid,
  jalaliMonthLabel,
  listBillableTasks,
  listInvoices,
  listMembers,
} from "@eth/core";
import { JalaliMonthInput } from "@/components/jalali-month-input";
import {
  InvoiceComposeForm,
  type ComposeTask,
} from "@/components/invoice-compose-form";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function InvoiceComposePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; userId?: string }>;
}) {
  const user = await requireAdmin();
  if (!can(user, "invoice.manage")) redirect("/admin/invoices");

  const sp = await searchParams;
  const periodKey =
    sp.month && isJalaliPeriodKey(sp.month)
      ? sp.month
      : currentMonthPeriod().periodKey;
  const selectedUserId =
    sp.userId && isUuid(sp.userId.trim()) ? sp.userId.trim() : "";

  const members = await listMembers(db());
  const editors = members
    .filter((m) => m.isActive && (m.role === "editor" || m.role === "admin" || m.role === "owner"))
    .map((m) => ({ id: m.id, displayName: m.displayName }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fa"));

  const billable = selectedUserId
    ? await listBillableTasks(db(), user, periodKey, selectedUserId)
    : [];

  const periodInvoices = await listInvoices(db(), user, periodKey);
  const existing = selectedUserId
    ? periodInvoices.find((i) => i.userId === selectedUserId)
    : null;

  const tasks: ComposeTask[] = billable.map(({ task, projectName }) => ({
    id: task.id,
    shortCode: task.shortCode,
    title: task.title,
    projectName,
    units: Number(task.units),
    amount: (task.amount ?? 0n).toString(),
    alreadyInvoiced: Boolean(
      task.invoiceId && task.invoiceId !== existing?.id,
    ),
  }));

  // Pre-check tasks already on this draft
  if (existing && (existing.status === "draft" || existing.status === "void")) {
    for (const t of tasks) {
      const row = billable.find((b) => b.task.id === t.id)?.task;
      if (row?.invoiceId === existing.id) {
        t.alreadyInvoiced = false;
      }
    }
  }

  return (
    <>
      <p>
        <Link href={`/admin/invoices?month=${periodKey}`} className="muted">
          ← بازگشت به فاکتورها
        </Link>
      </p>
      <h1 className="hero-title">فاکتور شخصی‌سازی</h1>
      <p className="hero-sub">
        تسک‌های تأییدشدهٔ ماه را برای هر ادیتور تیک بزنید، مجموع را ببینید و
        فاکتور را به پنلش ارسال کنید — {jalaliMonthLabel(periodKey)}.
      </p>

      <JalaliMonthInput
        key={periodKey}
        defaultValue={periodKey}
        submitLabel="تغییر ماه"
        hiddenFields={selectedUserId ? { userId: selectedUserId } : undefined}
      />

      <div className="panel">
        <InvoiceComposeForm
          key={`${periodKey}:${selectedUserId}`}
          periodKey={periodKey}
          periodLabel={jalaliMonthLabel(periodKey)}
          editors={editors}
          selectedUserId={selectedUserId}
          tasks={tasks}
          existingStatus={existing?.status ?? null}
        />
      </div>
    </>
  );
}
