import { and, asc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type {
  ActivitySource,
  Db,
  Invoice,
  Task,
  User,
} from "@eth/db";
import {
  invoiceLines,
  invoices,
  projects,
  tasks,
  users,
} from "@eth/db";
import {
  NotFoundError,
  PermissionError,
  ValidationError,
  assertCan,
  can,
} from "./permissions.js";
import { logAndEmit } from "./events.js";
import { computeAmount } from "./money.js";
import {
  currentMonthPeriod,
  parsePeriodKey,
  periodKeyAliases,
  type MonthPeriod,
} from "./calendar.js";
import { rateFor } from "./projects.js";

/** Apply pricing snapshot when approving a task that has a project. */
export async function applyApprovalPricing(
  db: Db,
  task: Task,
): Promise<Partial<Task>> {
  if (!task.projectId) {
    return { approvedAt: new Date(), unitPriceSnapshot: null, amount: null };
  }
  if (task.invoiceId) {
    throw new ValidationError("Task already invoiced");
  }

  const unitPrice = await rateFor(db, task.assigneeId, task.projectId);
  const amount = computeAmount(Number(task.units), unitPrice);
  return {
    unitPriceSnapshot: unitPrice,
    amount,
    approvedAt: new Date(),
  };
}

export type EditorEarnings = {
  userId: string;
  displayName: string;
  approvedCount: number;
  units: number;
  amount: bigint;
  tasks: Task[];
};

export async function monthlyEarnings(
  db: Db,
  actor: User,
  periodKey?: string,
  onlyUserId?: string,
): Promise<EditorEarnings[]> {
  const period = periodKey
    ? parsePeriodKey(periodKey)
    : currentMonthPeriod();

  if (onlyUserId && onlyUserId !== actor.id && !can(actor, "earnings.view_all")) {
    throw new PermissionError("Forbidden: view own earnings only");
  }
  if (!onlyUserId && !can(actor, "earnings.view_all")) {
    onlyUserId = actor.id;
  }

  const approved = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "approved"),
        sql`${tasks.approvedAt} IS NOT NULL`,
        gte(tasks.approvedAt, new Date(`${period.periodStart}T00:00:00+03:30`)),
        lte(tasks.approvedAt, new Date(`${period.periodEnd}T23:59:59.999+03:30`)),
      ),
    )
    .orderBy(asc(tasks.approvedAt));

  const filtered = onlyUserId
    ? approved.filter((t) => t.assigneeId === onlyUserId)
    : approved;

  const byUser = new Map<string, Task[]>();
  for (const t of filtered) {
    const list = byUser.get(t.assigneeId) ?? [];
    list.push(t);
    byUser.set(t.assigneeId, list);
  }

  const result: EditorEarnings[] = [];
  for (const [userId, userTasks] of byUser) {
    const u = (
      await db.select().from(users).where(eq(users.id, userId)).limit(1)
    )[0];
    let units = 0;
    let amount = 0n;
    for (const t of userTasks) {
      units += Number(t.units);
      amount += t.amount ?? 0n;
    }
    result.push({
      userId,
      displayName: u?.displayName ?? userId,
      approvedCount: userTasks.length,
      units,
      amount,
      tasks: userTasks,
    });
  }

  result.sort((a, b) => a.displayName.localeCompare(b.displayName, "fa"));
  return result;
}

async function nextInvoiceNumber(
  db: Db,
  periodKey: string,
): Promise<string> {
  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoices)
    .where(eq(invoices.periodKey, periodKey));
  const n = (existing[0]?.count ?? 0) + 1;
  return `INV-${periodKey}-${String(n).padStart(3, "0")}`;
}

export type BillableTaskRow = {
  task: Task;
  projectName: string | null;
};

/** Approved tasks with amount in the Jalali month — for personalized invoicing. */
export async function listBillableTasks(
  db: Db,
  actor: User,
  periodKey: string,
  userId?: string,
): Promise<BillableTaskRow[]> {
  assertCan(actor, "invoice.manage");
  const period = parsePeriodKey(periodKey);
  const start = new Date(`${period.periodStart}T00:00:00+03:30`);
  const end = new Date(`${period.periodEnd}T23:59:59.999+03:30`);

  const conds = [
    eq(tasks.status, "approved"),
    sql`${tasks.amount} IS NOT NULL`,
    gte(tasks.approvedAt, start),
    lte(tasks.approvedAt, end),
  ];
  if (userId) conds.push(eq(tasks.assigneeId, userId));

  const rows = await db
    .select({
      task: tasks,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(...conds))
    .orderBy(asc(tasks.approvedAt));

  return rows.map((r) => ({
    task: r.task,
    projectName: r.projectName ?? null,
  }));
}

export type PersonalizedInvoiceInput = {
  userId: string;
  periodKey: string;
  taskIds: string[];
  /** If true, set status to issued so it appears in the editor panel */
  issue?: boolean;
};

/**
 * Build / rebuild a draft invoice from explicitly selected tasks for one editor.
 * Reuses draft/void row for the same (user, period) unique key.
 */
export async function createPersonalizedInvoice(
  db: Db,
  actor: User,
  input: PersonalizedInvoiceInput,
  source: ActivitySource = "web",
): Promise<Invoice> {
  assertCan(actor, "invoice.manage");

  const period = parsePeriodKey(input.periodKey);
  const taskIds = [...new Set(input.taskIds.filter(Boolean))];
  if (taskIds.length === 0) {
    throw new ValidationError("حداقل یک تسک را انتخاب کنید");
  }

  const editor = (
    await db.select().from(users).where(eq(users.id, input.userId)).limit(1)
  )[0];
  if (!editor || !editor.isActive) {
    throw new NotFoundError("ادیتور پیدا نشد");
  }

  const selected = await db
    .select()
    .from(tasks)
    .where(inArray(tasks.id, taskIds));

  if (selected.length !== taskIds.length) {
    throw new ValidationError("برخی تسک‌ها پیدا نشدند");
  }

  const start = new Date(`${period.periodStart}T00:00:00+03:30`);
  const end = new Date(`${period.periodEnd}T23:59:59.999+03:30`);

  for (const t of selected) {
    if (t.assigneeId !== input.userId) {
      throw new ValidationError(`تسک ${t.shortCode} متعلق به این ادیتور نیست`);
    }
    if (t.status !== "approved" || t.amount == null || !t.approvedAt) {
      throw new ValidationError(`تسک ${t.shortCode} قابل فاکتور نیست`);
    }
    if (t.approvedAt < start || t.approvedAt > end) {
      throw new ValidationError(
        `تسک ${t.shortCode} خارج از ماه ${period.periodKey} است`,
      );
    }
  }

  const existing = (
    await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, input.userId),
          eq(invoices.periodKey, period.periodKey),
        ),
      )
      .limit(1)
  )[0];

  if (existing && (existing.status === "issued" || existing.status === "paid")) {
    throw new ValidationError(
      "فاکتور این ماه صادر/پرداخت شده — برای تغییر ابتدا باطل کنید",
    );
  }

  // Tasks already locked to another (non-this) invoice
  for (const t of selected) {
    if (t.invoiceId && t.invoiceId !== existing?.id) {
      throw new ValidationError(
        `تسک ${t.shortCode} قبلاً در فاکتور دیگری قفل شده`,
      );
    }
  }

  let invoice = existing ?? null;

  if (invoice) {
    await db
      .update(tasks)
      .set({ invoiceId: null, updatedAt: new Date() })
      .where(eq(tasks.invoiceId, invoice.id));
    await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoice.id));
  }

  let total = 0n;
  for (const t of selected) total += t.amount ?? 0n;

  if (!invoice) {
    const number = await nextInvoiceNumber(db, period.periodKey);
    const [created] = await db
      .insert(invoices)
      .values({
        number,
        userId: input.userId,
        periodKey: period.periodKey,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        totalAmount: total,
        status: "draft",
      })
      .returning();
    if (!created) throw new Error("Failed to create invoice");
    invoice = created;
  } else {
    const [updated] = await db
      .update(invoices)
      .set({
        totalAmount: total,
        status: "draft",
        issuedAt: null,
        paidAt: null,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      })
      .where(eq(invoices.id, invoice.id))
      .returning();
    if (!updated) throw new Error("Failed to update invoice");
    invoice = updated;
  }

  for (const t of selected) {
    let projectName: string | null = null;
    if (t.projectId) {
      const p = (
        await db
          .select()
          .from(projects)
          .where(eq(projects.id, t.projectId))
          .limit(1)
      )[0];
      projectName = p?.name ?? null;
    }
    await db.insert(invoiceLines).values({
      invoiceId: invoice.id,
      taskId: t.id,
      projectName,
      description: t.title,
      units: t.units,
      unitPrice: t.unitPriceSnapshot ?? 0n,
      amount: t.amount ?? 0n,
    });
    await db
      .update(tasks)
      .set({ invoiceId: invoice.id, updatedAt: new Date() })
      .where(eq(tasks.id, t.id));
  }

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "invoice.personalized",
    entityType: "invoice",
    entityId: invoice.id,
    payload: {
      number: invoice.number,
      userId: input.userId,
      total: total.toString(),
      periodKey: period.periodKey,
      taskCount: selected.length,
    },
    eventType: "invoice.updated",
  });

  if (input.issue) {
    return issueInvoice(db, actor, invoice.id, source);
  }
  return invoice;
}

/**
 * Idempotent: unique(user_id, period_key). Re-run skips existing invoices.
 * Only includes approved, unbilled tasks with amount in the period.
 */
export async function generateInvoicesForPeriod(
  db: Db,
  actor: User | null,
  period: MonthPeriod,
  source: ActivitySource = "system",
): Promise<Invoice[]> {
  if (actor) assertCan(actor, "invoice.manage");

  const start = new Date(`${period.periodStart}T00:00:00+03:30`);
  const end = new Date(`${period.periodEnd}T23:59:59.999+03:30`);

  const billable = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "approved"),
        isNull(tasks.invoiceId),
        sql`${tasks.amount} IS NOT NULL`,
        gte(tasks.approvedAt, start),
        lte(tasks.approvedAt, end),
      ),
    );

  const byUser = new Map<string, Task[]>();
  for (const t of billable) {
    const list = byUser.get(t.assigneeId) ?? [];
    list.push(t);
    byUser.set(t.assigneeId, list);
  }

  const created: Invoice[] = [];

  for (const [userId, userTasks] of byUser) {
    const existing = (
      await db
        .select()
        .from(invoices)
        .where(
          and(eq(invoices.userId, userId), eq(invoices.periodKey, period.periodKey)),
        )
        .limit(1)
    )[0];
    if (existing) {
      created.push(existing);
      continue;
    }

    let total = 0n;
    for (const t of userTasks) total += t.amount ?? 0n;

    const number = await nextInvoiceNumber(db, period.periodKey);
    const [invoice] = await db
      .insert(invoices)
      .values({
        number,
        userId,
        periodKey: period.periodKey,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        totalAmount: total,
        status: "draft",
      })
      .returning();

    if (!invoice) continue;

    for (const t of userTasks) {
      let projectName: string | null = null;
      if (t.projectId) {
        const p = (
          await db
            .select()
            .from(projects)
            .where(eq(projects.id, t.projectId))
            .limit(1)
        )[0];
        projectName = p?.name ?? null;
      }
      await db.insert(invoiceLines).values({
        invoiceId: invoice.id,
        taskId: t.id,
        projectName,
        description: t.title,
        units: t.units,
        unitPrice: t.unitPriceSnapshot ?? 0n,
        amount: t.amount ?? 0n,
      });
      await db
        .update(tasks)
        .set({ invoiceId: invoice.id, updatedAt: new Date() })
        .where(eq(tasks.id, t.id));
    }

    await logAndEmit(db, {
      actorId: actor?.id ?? null,
      source,
      action: "invoice.generated",
      entityType: "invoice",
      entityId: invoice.id,
      payload: {
        number: invoice.number,
        userId,
        total: total.toString(),
        periodKey: period.periodKey,
      },
      eventType: "invoice.updated",
    });

    created.push(invoice);
  }

  return created;
}

export async function issueInvoice(
  db: Db,
  actor: User,
  invoiceId: string,
  source: ActivitySource,
): Promise<Invoice> {
  assertCan(actor, "invoice.manage");
  const invoice = await getInvoiceById(db, invoiceId);
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.status === "paid") {
    throw new ValidationError("Paid invoice cannot be re-issued");
  }
  if (invoice.status === "void") {
    throw new ValidationError("Void invoice cannot be issued");
  }

  const [updated] = await db
    .update(invoices)
    .set({ status: "issued", issuedAt: new Date() })
    .where(eq(invoices.id, invoiceId))
    .returning();

  if (!updated) throw new Error("Failed to issue invoice");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "invoice.issued",
    entityType: "invoice",
    entityId: invoiceId,
    payload: { number: updated.number },
    eventType: "invoice.updated",
  });

  return updated;
}

export async function markInvoicePaid(
  db: Db,
  actor: User,
  invoiceId: string,
  source: ActivitySource,
  paymentReceipt?: string | null,
): Promise<Invoice> {
  assertCan(actor, "invoice.pay");
  const invoice = await getInvoiceById(db, invoiceId);
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.status === "void") {
    throw new ValidationError("Void invoice cannot be paid");
  }
  if (invoice.status === "draft") {
    throw new ValidationError("Issue invoice before marking paid");
  }
  if (invoice.status === "paid") {
    throw new ValidationError("این فاکتور قبلاً تأیید نهایی شده است");
  }

  const fromForm =
    paymentReceipt != null ? paymentReceipt.trim() || null : null;
  const receipt = fromForm ?? invoice.paymentReceipt;
  if (!receipt) {
    throw new ValidationError(
      "قبل از تأیید نهایی، فیش پرداختی را ذخیره کنید",
    );
  }

  const [updated] = await db
    .update(invoices)
    .set({
      status: "paid",
      paidAt: new Date(),
      paymentReceipt: receipt,
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  if (!updated) throw new Error("Failed to mark paid");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "invoice.paid",
    entityType: "invoice",
    entityId: invoiceId,
    payload: {
      number: updated.number,
      hasReceipt: Boolean(receipt),
    },
    eventType: "invoice.updated",
  });

  return updated;
}

/** Save / update payment slip text (tracking code, bank note, …). */
export async function setInvoicePaymentReceipt(
  db: Db,
  actor: User,
  invoiceId: string,
  paymentReceipt: string,
  source: ActivitySource = "web",
): Promise<Invoice> {
  const invoice = await getInvoiceById(db, invoiceId);
  if (!invoice) throw new NotFoundError("Invoice not found");

  const isOwnerEditor = invoice.userId === actor.id;
  const isAdmin =
    can(actor, "invoice.manage") || can(actor, "invoice.pay");

  if (!isAdmin && !isOwnerEditor) {
    throw new PermissionError("Forbidden");
  }
  if (invoice.status === "void") {
    throw new ValidationError("فاکتور باطل قابل ویرایش نیست");
  }
  if (invoice.status === "paid") {
    throw new ValidationError(
      "پرداخت تأیید نهایی شده و فیش قفل است — برای تغییر ابتدا وضعیت را باز کنید",
    );
  }
  if (invoice.status === "draft" && !isAdmin) {
    throw new ValidationError("پیش‌نویس هنوز صادر نشده");
  }

  const receipt = paymentReceipt.trim();
  if (!receipt) {
    throw new ValidationError("متن فیش پرداختی خالی است");
  }

  const [updated] = await db
    .update(invoices)
    .set({ paymentReceipt: receipt })
    .where(eq(invoices.id, invoiceId))
    .returning();

  if (!updated) throw new Error("Failed to save payment receipt");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "invoice.payment_receipt",
    entityType: "invoice",
    entityId: invoiceId,
    payload: { number: updated.number },
    eventType: "invoice.updated",
  });

  return updated;
}

export async function voidInvoice(
  db: Db,
  actor: User,
  invoiceId: string,
  source: ActivitySource,
): Promise<Invoice> {
  assertCan(actor, "invoice.manage");
  const invoice = await getInvoiceById(db, invoiceId);
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.status === "paid") {
    throw new ValidationError("Paid invoices cannot be voided");
  }

  await db
    .update(tasks)
    .set({ invoiceId: null, updatedAt: new Date() })
    .where(eq(tasks.invoiceId, invoiceId));

  const [updated] = await db
    .update(invoices)
    .set({ status: "void" })
    .where(eq(invoices.id, invoiceId))
    .returning();

  if (!updated) throw new Error("Failed to void");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "invoice.voided",
    entityType: "invoice",
    entityId: invoiceId,
    payload: { number: updated.number },
    eventType: "invoice.updated",
  });

  return updated;
}

export async function getInvoiceById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  return rows[0] ?? null;
}

const INVOICE_STATUSES = ["draft", "issued", "paid", "void"] as const;
export type InvoiceStatusFilter = (typeof INVOICE_STATUSES)[number];

export type InvoiceListFilter = {
  userId?: string;
  status?: InvoiceStatusFilter;
  number?: string;
};

export function parseInvoiceStatus(
  value: string | undefined,
): InvoiceStatusFilter | undefined {
  if (!value) return undefined;
  return (INVOICE_STATUSES as readonly string[]).includes(value)
    ? (value as InvoiceStatusFilter)
    : undefined;
}

export async function listInvoices(
  db: Db,
  actor: User,
  periodKey?: string,
  filter?: InvoiceListFilter,
) {
  const aliases = periodKey ? periodKeyAliases(periodKey) : null;
  const managed =
    can(actor, "invoice.manage") || can(actor, "earnings.view_all");
  const conds = [];

  if (!managed) {
    conds.push(eq(invoices.userId, actor.id));
    if (!filter?.status) {
      conds.push(
        or(eq(invoices.status, "issued"), eq(invoices.status, "paid"))!,
      );
    } else if (filter.status === "issued" || filter.status === "paid") {
      conds.push(eq(invoices.status, filter.status));
    } else {
      return [];
    }
  } else {
    if (filter?.userId) conds.push(eq(invoices.userId, filter.userId));
    if (filter?.status) conds.push(eq(invoices.status, filter.status));
  }

  if (aliases) conds.push(inArray(invoices.periodKey, aliases));
  const numberQ = filter?.number?.trim().replace(/[%_]/g, "");
  if (numberQ) conds.push(ilike(invoices.number, `%${numberQ}%`));

  const query = db.select().from(invoices);
  if (!conds.length) return query.orderBy(asc(invoices.createdAt));
  return query.where(and(...conds)).orderBy(asc(invoices.number));
}

export type ClientInvoiceRow = {
  invoice: Invoice;
  amount: bigint;
  projectNames: string[];
};

export async function listClientProjectInvoices(
  db: Db,
  actor: User,
): Promise<ClientInvoiceRow[]> {
  assertCan(actor, "invoice.view_project");
  if (actor.role !== "client" || !actor.clientId) return [];

  const rows = await db
    .select({
      invoice: invoices,
      line: invoiceLines,
      projectName: projects.name,
    })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
    .innerJoin(tasks, eq(invoiceLines.taskId, tasks.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(projects.clientId, actor.clientId),
        or(eq(invoices.status, "issued"), eq(invoices.status, "paid"))!,
      ),
    )
    .orderBy(asc(invoices.number));

  const byId = new Map<string, ClientInvoiceRow>();
  for (const row of rows) {
    const current = byId.get(row.invoice.id);
    if (!current) {
      byId.set(row.invoice.id, {
        invoice: row.invoice,
        amount: row.line.amount,
        projectNames: row.projectName ? [row.projectName] : [],
      });
      continue;
    }
    current.amount += row.line.amount;
    if (row.projectName && !current.projectNames.includes(row.projectName)) {
      current.projectNames.push(row.projectName);
    }
  }
  return [...byId.values()];
}

export async function getInvoiceDetail(db: Db, actor: User, invoiceId: string) {
  const invoice = await getInvoiceById(db, invoiceId);
  if (!invoice) throw new NotFoundError("Invoice not found");

  const isClient = actor.role === "client";
  if (isClient) {
    assertCan(actor, "invoice.view_project");
  } else if (
    invoice.userId !== actor.id &&
    !can(actor, "invoice.manage") &&
    !can(actor, "earnings.view_all")
  ) {
    throw new PermissionError("Forbidden");
  }

  const lineRows = await db
    .select({
      line: invoiceLines,
      clientId: projects.clientId,
    })
    .from(invoiceLines)
    .innerJoin(tasks, eq(invoiceLines.taskId, tasks.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(invoiceLines.invoiceId, invoiceId));

  let lines = lineRows.map((row) => row.line);
  let clientAmount: bigint | null = null;
  if (isClient) {
    const visible = lineRows.filter((row) => row.clientId === actor.clientId);
    if (visible.length === 0) throw new PermissionError("Forbidden");
    lines = visible.map((row) => row.line);
    clientAmount = lines.reduce((sum, line) => sum + line.amount, 0n);
  }

  const editor = (
    await db.select().from(users).where(eq(users.id, invoice.userId)).limit(1)
  )[0];

  return { invoice, lines, editor, clientAmount };
}

export async function assertTaskEditable(task: Task) {
  if (task.invoiceId) {
    throw new ValidationError("Invoiced tasks cannot be edited");
  }
}
