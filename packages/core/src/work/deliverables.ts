import { eq } from "drizzle-orm";
import type { ActivitySource, Db, Deliverable, User, VideoType } from "@eth/db";
import { categories, clients, deliverables, tasks, users } from "@eth/db";
import { formatPortfolioCaption, slugifyHashtag } from "@eth/telegram";
import {
  NotFoundError,
  PermissionError,
  ValidationError,
  assertCan,
} from "./permissions.js";
import { logAndEmit } from "./events.js";

export type SubmitDeliverableInput = {
  taskId: string;
  title: string;
  categoryId: string;
  clientId?: string | null;
  videoType: VideoType;
  tgFileId: string;
  tgFileUniqueId: string;
  channelChatId: bigint;
  channelMsgId: number;
  caption?: string;
};

export async function submitDeliverable(
  db: Db,
  actor: User,
  input: SubmitDeliverableInput,
  source: ActivitySource,
): Promise<Deliverable> {
  assertCan(actor, "deliverable.submit");

  const existing = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.tgFileUniqueId, input.tgFileUniqueId))
    .limit(1);
  if (existing[0]) {
    return existing[0];
  }

  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, input.taskId))
    .limit(1);
  const task = taskRows[0];
  if (!task) throw new NotFoundError("Task not found");

  if (task.assigneeId !== actor.id && actor.role === "editor") {
    throw new PermissionError("Can only submit for own tasks");
  }
  if (task.status === "approved") {
    throw new ValidationError("Task already approved");
  }

  const category = (
    await db
      .select()
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .limit(1)
  )[0];
  if (!category) throw new NotFoundError("Category not found");

  let clientName: string | null = null;
  let clientSlug: string | null = null;
  if (input.clientId) {
    const client = (
      await db
        .select()
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1)
    )[0];
    if (!client) throw new NotFoundError("Client not found");
    clientName = client.name;
    clientSlug = slugifyHashtag(client.name);
  }

  const editor = (
    await db.select().from(users).where(eq(users.id, actor.id)).limit(1)
  )[0];

  const caption =
    input.caption ??
    formatPortfolioCaption({
      title: input.title,
      categoryName: category.name,
      categorySlug: category.slug,
      clientName,
      clientSlug,
      videoType: input.videoType,
      editorName: editor?.displayName ?? "Editor",
    });

  const [row] = await db
    .insert(deliverables)
    .values({
      taskId: input.taskId,
      submittedBy: actor.id,
      title: input.title,
      categoryId: input.categoryId,
      clientId: input.clientId ?? null,
      videoType: input.videoType,
      tgFileId: input.tgFileId,
      tgFileUniqueId: input.tgFileUniqueId,
      channelChatId: input.channelChatId,
      channelMsgId: input.channelMsgId,
      caption,
    })
    .returning();

  if (!row) throw new Error("Failed to create deliverable");

  await db
    .update(tasks)
    .set({ status: "delivered", updatedAt: new Date() })
    .where(eq(tasks.id, task.id));

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "deliverable.published",
    entityType: "deliverable",
    entityId: row.id,
    payload: {
      taskId: task.id,
      shortCode: task.shortCode,
      channelMsgId: input.channelMsgId,
    },
    eventType: "deliverable.published",
  });

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "task.status_changed",
    entityType: "task",
    entityId: task.id,
    payload: { from: task.status, to: "delivered", shortCode: task.shortCode },
    eventType: "task.updated",
  });

  return row;
}

export async function listDeliverables(
  db: Db,
  filters?: {
    categoryId?: string;
    clientId?: string;
    videoType?: VideoType;
    editorId?: string;
  },
) {
  const rows = await db
    .select({
      deliverable: deliverables,
      category: categories,
      client: clients,
      editor: users,
      task: tasks,
    })
    .from(deliverables)
    .leftJoin(categories, eq(deliverables.categoryId, categories.id))
    .leftJoin(clients, eq(deliverables.clientId, clients.id))
    .leftJoin(users, eq(deliverables.submittedBy, users.id))
    .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
    .orderBy(deliverables.createdAt);

  return rows.filter((r) => {
    if (filters?.categoryId && r.deliverable.categoryId !== filters.categoryId)
      return false;
    if (filters?.clientId && r.deliverable.clientId !== filters.clientId)
      return false;
    if (filters?.videoType && r.deliverable.videoType !== filters.videoType)
      return false;
    if (filters?.editorId && r.deliverable.submittedBy !== filters.editorId)
      return false;
    return true;
  });
}
