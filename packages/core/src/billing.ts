import { and, asc, eq, gte, isNull, lte, sql } from "drizzle-orm";
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

  const [updated] = await db
    .update(invoices)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(invoices.id, invoiceId))
    .returning();

  if (!updated) throw new Error("Failed to mark paid");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "invoice.paid",
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

export async function listInvoices(
  db: Db,
  actor: User,
  periodKey?: string,
) {
  if (can(actor, "invoice.manage") || can(actor, "earnings.view_all")) {
    if (periodKey) {
      return db
        .select()
        .from(invoices)
        .where(eq(invoices.periodKey, periodKey))
        .orderBy(asc(invoices.number));
    }
    return db.select().from(invoices).orderBy(asc(invoices.createdAt));
  }

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, actor.id))
    .orderBy(asc(invoices.createdAt));
  return periodKey ? rows.filter((r) => r.periodKey === periodKey) : rows;
}

export async function getInvoiceDetail(db: Db, actor: User, invoiceId: string) {
  const invoice = await getInvoiceById(db, invoiceId);
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (
    invoice.userId !== actor.id &&
    !can(actor, "invoice.manage") &&
    !can(actor, "earnings.view_all")
  ) {
    throw new PermissionError("Forbidden");
  }

  const lines = await db
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoiceId));
  const editor = (
    await db.select().from(users).where(eq(users.id, invoice.userId)).limit(1)
  )[0];

  return { invoice, lines, editor };
}

export async function assertTaskEditable(task: Task) {
  if (task.invoiceId) {
    throw new ValidationError("Invoiced tasks cannot be edited");
  }
}
