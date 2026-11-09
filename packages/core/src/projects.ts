import { and, asc, eq } from "drizzle-orm";
import type {
  ActivitySource,
  Db,
  Project,
  User,
  VideoType,
} from "@eth/db";
import { projectMembers, projects, users } from "@eth/db";
import {
  NotFoundError,
  PermissionError,
  ValidationError,
  assertCan,
  can,
} from "./permissions.js";
import { logAndEmit } from "./events.js";

export type CreateProjectInput = {
  name: string;
  clientId?: string | null;
  categoryId?: string | null;
  videoType?: VideoType | null;
  unitLabel?: string;
  unitPrice: bigint;
  memberIds: string[];
  rateOverrides?: Record<string, bigint | null>;
};

export async function createProject(
  db: Db,
  actor: User,
  input: CreateProjectInput,
  source: ActivitySource,
): Promise<Project> {
  assertCan(actor, "project.manage");
  if (input.unitPrice < 0n) throw new ValidationError("Invalid unit price");

  const [project] = await db
    .insert(projects)
    .values({
      name: input.name.trim(),
      clientId: input.clientId ?? null,
      categoryId: input.categoryId ?? null,
      videoType: input.videoType ?? null,
      unitLabel: input.unitLabel?.trim() || "episode",
      unitPrice: input.unitPrice,
      createdBy: actor.id,
      status: "open",
    })
    .returning();

  if (!project) throw new Error("Failed to create project");

  await setProjectMembers(
    db,
    actor,
    project.id,
    input.memberIds,
    source,
    input.rateOverrides,
    true,
  );

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "project.created",
    entityType: "project",
    entityId: project.id,
    payload: {
      name: project.name,
      unitPrice: project.unitPrice.toString(),
    },
  });

  return project;
}

export async function setProjectMembers(
  db: Db,
  actor: User,
  projectId: string,
  memberIds: string[],
  source: ActivitySource,
  rateOverrides?: Record<string, bigint | null>,
  skipAuth = false,
) {
  if (!skipAuth) assertCan(actor, "project.manage");

  const project = await getProjectById(db, projectId);
  if (!project) throw new NotFoundError("Project not found");

  await db
    .delete(projectMembers)
    .where(eq(projectMembers.projectId, projectId));

  const unique = [...new Set(memberIds)];
  for (const userId of unique) {
    const u = (
      await db.select().from(users).where(eq(users.id, userId)).limit(1)
    )[0];
    if (!u?.isActive) throw new NotFoundError(`Member not found: ${userId}`);
    await db.insert(projectMembers).values({
      projectId,
      userId,
      rateOverride: rateOverrides?.[userId] ?? null,
    });
  }

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "project.members_set",
    entityType: "project",
    entityId: projectId,
    payload: { memberIds: unique },
  });
}

export async function updateProject(
  db: Db,
  actor: User,
  projectId: string,
  patch: Partial<{
    name: string;
    clientId: string | null;
    categoryId: string | null;
    videoType: VideoType | null;
    unitLabel: string;
    unitPrice: bigint;
    status: "open" | "closed";
  }>,
  source: ActivitySource,
): Promise<Project> {
  assertCan(actor, "project.manage");
  const existing = await getProjectById(db, projectId);
  if (!existing) throw new NotFoundError("Project not found");

  const [updated] = await db
    .update(projects)
    .set(patch)
    .where(eq(projects.id, projectId))
    .returning();
  if (!updated) throw new Error("Failed to update project");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "project.updated",
    entityType: "project",
    entityId: projectId,
    payload: {
      ...patch,
      unitPrice: patch.unitPrice?.toString(),
    },
  });

  return updated;
}

export async function getProjectById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listProjects(db: Db, actor: User) {
  if (can(actor, "project.manage") || can(actor, "earnings.view_all")) {
    return db.select().from(projects).orderBy(asc(projects.createdAt));
  }
  const rows = await db
    .select({ project: projects })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(eq(projectMembers.userId, actor.id));
  return rows.map((r) => r.project);
}

export async function listProjectMembers(db: Db, projectId: string) {
  return db
    .select({
      member: projectMembers,
      user: users,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));
}

export async function isProjectOpenTo(
  db: Db,
  projectId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Effective rate for an editor on a project */
export async function rateFor(
  db: Db,
  userId: string,
  projectId: string,
): Promise<bigint> {
  const project = await getProjectById(db, projectId);
  if (!project) throw new NotFoundError("Project not found");

  const member = (
    await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
        ),
      )
      .limit(1)
  )[0];

  if (!member) {
    throw new PermissionError("Project is not open to this editor");
  }

  return member.rateOverride ?? project.unitPrice;
}

export async function assertCanUseProject(
  db: Db,
  actor: User,
  projectId: string,
  assigneeId: string,
) {
  const project = await getProjectById(db, projectId);
  if (!project) throw new NotFoundError("Project not found");
  if (project.status !== "open") {
    throw new ValidationError("Project is closed");
  }
  if (can(actor, "project.manage")) {
    const ok = await isProjectOpenTo(db, projectId, assigneeId);
    if (!ok) {
      throw new PermissionError("Assignee is not a member of this project");
    }
    return project;
  }
  if (assigneeId !== actor.id) {
    throw new PermissionError("Cannot assign others on this project");
  }
  const ok = await isProjectOpenTo(db, projectId, actor.id);
  if (!ok) {
    throw new PermissionError("Project is not open to you");
  }
  return project;
}
