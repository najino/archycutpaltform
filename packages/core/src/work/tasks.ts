import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type {
  ActivitySource,
  Db,
  Task,
  TaskStatus,
  User,
  VideoType,
} from "@eth/db";
import { taskCounters, tasks, users } from "@eth/db";
import {
  NotFoundError,
  PermissionError,
  ValidationError,
  assertCan,
  assertCanModifyTask,
  can,
} from "./permissions.js";
import { logAndEmit } from "./events.js";
import { weekKeyFromDueOrCreated } from "./week.js";
import { applyApprovalPricing, assertTaskEditable } from "./billing.js";
import { assertCanUseProject } from "./projects.js";

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress"],
  in_progress: ["delivered", "todo"],
  delivered: ["approved", "rejected"],
  approved: [],
  rejected: ["in_progress"],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

async function nextShortCode(db: Db): Promise<string> {
  const rows = await db
    .update(taskCounters)
    .set({ lastValue: sql`${taskCounters.lastValue} + 1` })
    .where(eq(taskCounters.id, 1))
    .returning({ lastValue: taskCounters.lastValue });

  let value = rows[0]?.lastValue;
  if (value == null) {
    await db.insert(taskCounters).values({ id: 1, lastValue: 1 });
    value = 1;
  }
  return `T-${String(value).padStart(4, "0")}`;
}

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  assigneeId: string;
  clientId?: string | null;
  categoryId?: string | null;
  videoType?: VideoType | null;
  dueDate?: string | null;
  projectId?: string | null;
  units?: number;
};

export async function createTask(
  db: Db,
  actor: User,
  input: CreateTaskInput,
  source: ActivitySource,
): Promise<Task> {
  assertCan(actor, "task.create");

  const selfAssign = input.assigneeId === actor.id;
  if (!selfAssign) {
    assertCan(actor, "task.assign");
  }

  const assignee = await db
    .select()
    .from(users)
    .where(eq(users.id, input.assigneeId))
    .limit(1);
  if (!assignee[0] || !assignee[0].isActive) {
    throw new NotFoundError("Assignee not found");
  }

  let clientId = input.clientId ?? null;
  let categoryId = input.categoryId ?? null;
  let videoType = input.videoType ?? null;

  if (input.projectId) {
    const project = await assertCanUseProject(
      db,
      actor,
      input.projectId,
      input.assigneeId,
    );
    clientId = clientId ?? project.clientId;
    categoryId = categoryId ?? project.categoryId;
    videoType = videoType ?? project.videoType;
  }

  const units = input.units ?? 1;
  if (units <= 0) throw new ValidationError("units must be > 0");

  const shortCode = await nextShortCode(db);
  const weekKey = weekKeyFromDueOrCreated(input.dueDate ?? null);

  const [task] = await db
    .insert(tasks)
    .values({
      shortCode,
      title: input.title.trim(),
      description: input.description ?? null,
      assigneeId: input.assigneeId,
      createdBy: actor.id,
      clientId,
      categoryId,
      videoType,
      dueDate: input.dueDate ?? null,
      projectId: input.projectId ?? null,
      units,
      weekKey,
      status: "todo",
    })
    .returning();

  if (!task) throw new Error("Failed to create task");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "task.created",
    entityType: "task",
    entityId: task.id,
    payload: { shortCode: task.shortCode, assigneeId: task.assigneeId },
    eventType: "task.updated",
  });

  return task;
}

export async function getTaskById(db: Db, id: string): Promise<Task | null> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getTaskByShortCode(
  db: Db,
  shortCode: string,
): Promise<Task | null> {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.shortCode, shortCode.toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function listWeekTasks(
  db: Db,
  actor: User,
  weekKey: string,
  opts?: { assigneeId?: string },
): Promise<Task[]> {
  if (can(actor, "task.view_all")) {
    const conditions = [eq(tasks.weekKey, weekKey)];
    if (opts?.assigneeId) {
      conditions.push(eq(tasks.assigneeId, opts.assigneeId));
    }
    return db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));
  }

  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.weekKey, weekKey), eq(tasks.assigneeId, actor.id)))
    .orderBy(desc(tasks.createdAt));
}

export async function changeStatus(
  db: Db,
  actor: User,
  taskIdOrCode: string,
  nextStatus: TaskStatus,
  source: ActivitySource,
  reason?: string,
): Promise<Task> {
  const task =
    (await getTaskById(db, taskIdOrCode)) ??
    (await getTaskByShortCode(db, taskIdOrCode));

  if (!task) throw new NotFoundError("Task not found");
  await assertTaskEditable(task);

  if (!canTransition(task.status, nextStatus)) {
    throw new ValidationError(
      `Cannot transition from ${task.status} to ${nextStatus}`,
    );
  }

  if (nextStatus === "approved") {
    assertCan(actor, "task.status.approve");
  } else if (nextStatus === "rejected") {
    assertCan(actor, "task.status.reject");
  } else if (nextStatus === "delivered") {
    if (!can(actor, "task.edit_any") && task.assigneeId !== actor.id) {
      throw new PermissionError("Forbidden: deliver own tasks only");
    }
  } else {
    assertCanModifyTask(actor, task);
  }

  const pricing =
    nextStatus === "approved" ? await applyApprovalPricing(db, task) : {};

  const [updated] = await db
    .update(tasks)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
      ...pricing,
    })
    .where(eq(tasks.id, task.id))
    .returning();

  if (!updated) throw new Error("Failed to update task");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "task.status_changed",
    entityType: "task",
    entityId: task.id,
    payload: {
      from: task.status,
      to: nextStatus,
      shortCode: task.shortCode,
      reason: reason ?? null,
      amount: updated.amount?.toString() ?? null,
      unitPriceSnapshot: updated.unitPriceSnapshot?.toString() ?? null,
    },
    eventType: "task.updated",
  });

  return updated;
}

export async function updateTask(
  db: Db,
  actor: User,
  taskId: string,
  patch: Partial<{
    title: string;
    description: string | null;
    assigneeId: string;
    clientId: string | null;
    categoryId: string | null;
    videoType: VideoType | null;
    dueDate: string | null;
    projectId: string | null;
    units: number;
  }>,
  source: ActivitySource,
): Promise<Task> {
  const task = await getTaskById(db, taskId);
  if (!task) throw new NotFoundError("Task not found");
  assertCanModifyTask(actor, task);
  await assertTaskEditable(task);

  if (patch.projectId) {
    await assertCanUseProject(
      db,
      actor,
      patch.projectId,
      patch.assigneeId ?? task.assigneeId,
    );
  }
  if (patch.units != null && patch.units <= 0) {
    throw new ValidationError("units must be > 0");
  }

  if (patch.assigneeId && patch.assigneeId !== task.assigneeId) {
    assertCan(actor, "task.assign");
  }

  const dueDate = patch.dueDate !== undefined ? patch.dueDate : task.dueDate;
  const weekKey = weekKeyFromDueOrCreated(dueDate, task.createdAt);

  const [updated] = await db
    .update(tasks)
    .set({
      ...patch,
      weekKey,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, task.id))
    .returning();

  if (!updated) throw new Error("Failed to update task");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "task.updated",
    entityType: "task",
    entityId: task.id,
    payload: patch,
    eventType: "task.updated",
  });

  return updated;
}

export async function listTasksForSubmit(
  db: Db,
  actor: User,
): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.assigneeId, actor.id),
        inArray(tasks.status, ["todo", "in_progress", "rejected"]),
      ),
    )
    .orderBy(desc(tasks.updatedAt));
}
