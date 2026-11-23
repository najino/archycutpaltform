import { eq, sql } from "drizzle-orm";
import type { Db, User } from "@eth/db";
import { clients, users } from "@eth/db";
import {
  NotFoundError,
  PermissionError,
  ValidationError,
  assertCan,
} from "./permissions.js";
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  verifyPassword,
} from "./password.js";
import { getUserByTelegramId } from "./invites.js";
import { logAndEmit } from "../shared/events.js";
import type { ActivitySource } from "@eth/db";

export const LOGIN_FAILED_MESSAGE = "نام کاربری یا رمز عبور اشتباه است";

let dummyLoginHash: string | null = null;

function dummyHash(): string {
  dummyLoginHash ??= hashPassword("invalid-login-placeholder");
  return dummyLoginHash;
}

function rejectLogin(password: string): never {
  verifyPassword(password, dummyHash());
  throw new PermissionError(LOGIN_FAILED_MESSAGE);
}

export async function loginWithTelegramId(
  db: Db,
  telegramIdRaw: string,
  password: string,
): Promise<User> {
  const telegramId = telegramIdRaw.trim();
  if (!/^\d+$/.test(telegramId)) {
    throw new ValidationError("آیدی تلگرام باید عددی باشد");
  }
  if (!password) {
    throw new ValidationError("رمز عبور لازم است");
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    rejectLogin(password.slice(0, MAX_PASSWORD_LENGTH));
  }

  const user = await getUserByTelegramId(db, BigInt(telegramId));
  if (!user || !user.isActive || !user.passwordHash) {
    rejectLogin(password);
  }
  if (!verifyPassword(password, user.passwordHash)) {
    rejectLogin(password);
  }
  return user;
}

const USERNAME_RE = /^[a-zA-Z0-9._]{3,32}$/;

export async function loginWithUsername(
  db: Db,
  usernameRaw: string,
  password: string,
): Promise<User> {
  const username = usernameRaw.trim();
  if (!username) {
    throw new ValidationError("نام کاربری لازم است");
  }
  if (!password) {
    throw new ValidationError("رمز عبور لازم است");
  }
  if (password.length > MAX_PASSWORD_LENGTH || !USERNAME_RE.test(username)) {
    rejectLogin(password.slice(0, MAX_PASSWORD_LENGTH));
  }

  const user = (
    await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
      .limit(1)
  )[0];

  if (!user || !user.isActive || user.role !== "client" || !user.passwordHash) {
    rejectLogin(password);
  }
  if (!verifyPassword(password, user.passwordHash)) {
    rejectLogin(password);
  }
  return user;
}

export async function createClientUser(
  db: Db,
  actor: User,
  input: {
    clientId: string;
    username: string;
    password: string;
    displayName?: string;
  },
  source: ActivitySource = "web",
): Promise<User> {
  assertCan(actor, "settings.manage");
  const username = input.username.trim();
  if (!USERNAME_RE.test(username)) {
    throw new ValidationError(
      "نام کاربری ۳ تا ۳۲ حرف انگلیسی، عدد، نقطه یا زیرخط باشد",
    );
  }
  if (input.password.length < 6 || input.password.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError("رمز بین ۶ تا ۲۵۶ کاراکتر باشد");
  }

  const client = (
    await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1)
  )[0];
  if (!client) throw new NotFoundError("کارفرما پیدا نشد");

  const takenUser = (
    await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
      .limit(1)
  )[0];
  if (takenUser) throw new ValidationError("این نام کاربری قبلاً گرفته شده");

  const takenClient = (
    await db
      .select()
      .from(users)
      .where(eq(users.clientId, input.clientId))
      .limit(1)
  )[0];
  if (takenClient) {
    throw new ValidationError("این کارفرما از قبل حساب ورود دارد");
  }

  const [created] = await db
    .insert(users)
    .values({
      telegramId: null,
      username,
      displayName: input.displayName?.trim() || client.name,
      passwordHash: hashPassword(input.password),
      role: "client",
      clientId: input.clientId,
      isActive: true,
    })
    .returning();
  if (!created) throw new Error("Failed to create client user");

  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "client.user_created",
    entityType: "user",
    entityId: created.id,
    payload: { clientId: input.clientId, username },
  });

  return created;
}

export async function setUserPassword(
  db: Db,
  actor: User,
  targetUserId: string,
  newPassword: string,
) {
  if (newPassword.length < 6 || newPassword.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError("رمز بین ۶ تا ۲۵۶ کاراکتر باشد");
  }

  const isSelf = actor.id === targetUserId;
  if (!isSelf && actor.role !== "owner" && actor.role !== "admin") {
    throw new PermissionError("Forbidden");
  }

  const hash = hashPassword(newPassword);
  const [updated] = await db
    .update(users)
    .set({ passwordHash: hash })
    .where(eq(users.id, targetUserId))
    .returning();

  if (!updated) throw new NotFoundError("User not found");
  return updated;
}
