import { and, eq, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { ActivitySource, Db, InviteCode, User, UserRole } from "@eth/db";
import { inviteCodes, users } from "@eth/db";
import {
  NotFoundError,
  PermissionError,
  ValidationError,
  assertCan,
} from "./permissions.js";
import { logAndEmit } from "./events.js";
import { hashPassword } from "./password.js";

function generateCode(): string {
  return randomBytes(8).toString("hex");
}

export async function createInvite(
  db: Db,
  actor: User,
  role: "admin" | "editor",
  source: ActivitySource,
  expiresInHours = 48,
): Promise<InviteCode> {
  assertCan(actor, "invite.create");
  if (role === "admin" && actor.role !== "owner" && actor.role !== "admin") {
    throw new PermissionError("Cannot invite admins");
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const [invite] = await db
    .insert(inviteCodes)
    .values({
      code,
      role,
      createdBy: actor.id,
      expiresAt,
    })
    .returning();

  if (!invite) throw new Error("Failed to create invite");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "invite.created",
    entityType: "invite",
    entityId: null,
    payload: { code, role },
  });

  return invite;
}

export async function redeemInvite(
  db: Db,
  code: string,
  telegram: {
    telegramId: bigint;
    username?: string | null;
    displayName: string;
  },
  source: ActivitySource,
): Promise<User> {
  const invite = (
    await db
      .select()
      .from(inviteCodes)
      .where(and(eq(inviteCodes.code, code), isNull(inviteCodes.usedBy)))
      .limit(1)
  )[0];

  if (!invite) throw new NotFoundError("Invite not found or already used");
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new ValidationError("Invite expired");
  }

  const existing = (
    await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegram.telegramId))
      .limit(1)
  )[0];

  if (existing) {
    await db
      .update(inviteCodes)
      .set({ usedBy: existing.id })
      .where(eq(inviteCodes.code, code));
    return existing;
  }

  // Initial web password = invite code (admin can change later in Settings)
  const [user] = await db
    .insert(users)
    .values({
      telegramId: telegram.telegramId,
      username: telegram.username ?? null,
      displayName: telegram.displayName,
      role: invite.role,
      passwordHash: hashPassword(code),
      isActive: true,
    })
    .returning();

  if (!user) throw new Error("Failed to create user");

  await db
    .update(inviteCodes)
    .set({ usedBy: user.id })
    .where(eq(inviteCodes.code, code));

  await logAndEmit(db, {
    actorId: user.id,
    source,
    action: "member.joined",
    entityType: "user",
    entityId: user.id,
    payload: { role: invite.role, via: code },
  });

  return user;
}

/** Returned alongside user so bot can show initial password once */
export async function redeemInviteWithPasswordHint(
  db: Db,
  code: string,
  telegram: {
    telegramId: bigint;
    username?: string | null;
    displayName: string;
  },
  source: ActivitySource,
): Promise<{ user: User; initialPassword: string | null }> {
  const existing = await getUserByTelegramId(db, telegram.telegramId);
  if (existing) {
    const user = await redeemInvite(db, code, telegram, source);
    return { user, initialPassword: null };
  }
  const user = await redeemInvite(db, code, telegram, source);
  return { user, initialPassword: code };
}

export async function setUserRole(
  db: Db,
  actor: User,
  targetUserId: string,
  role: UserRole,
  source: ActivitySource,
): Promise<User> {
  assertCan(actor, "member.promote");
  if (actor.role !== "owner") {
    throw new PermissionError("Only owner can promote/demote");
  }
  if (role === "owner") {
    throw new ValidationError("Cannot assign owner via promote");
  }

  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, targetUserId))
    .returning();

  if (!updated) throw new NotFoundError("User not found");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: role === "admin" ? "admin.added" : "admin.removed",
    entityType: "user",
    entityId: updated.id,
    payload: { role },
  });

  return updated;
}

export async function listMembers(db: Db) {
  return db.select().from(users).orderBy(users.createdAt);
}

export async function getUserByTelegramId(db: Db, telegramId: bigint) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserById(db: Db, id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}
