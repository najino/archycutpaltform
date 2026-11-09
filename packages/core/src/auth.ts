import { eq } from "drizzle-orm";
import type { Db, User } from "@eth/db";
import { users } from "@eth/db";
import { NotFoundError, PermissionError, ValidationError } from "./permissions.js";
import { hashPassword, verifyPassword } from "./password.js";
import { getUserByTelegramId } from "./invites.js";

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

  const user = await getUserByTelegramId(db, BigInt(telegramId));
  if (!user || !user.isActive) {
    throw new NotFoundError("کاربر پیدا نشد یا غیرفعال است");
  }
  if (!user.passwordHash) {
    throw new PermissionError(
      "برای این کاربر رمز تنظیم نشده. از ادمین بخواهید رمز بگذارد.",
    );
  }
  if (!verifyPassword(password, user.passwordHash)) {
    throw new PermissionError("آیدی یا رمز عبور اشتباه است");
  }
  return user;
}

export async function setUserPassword(
  db: Db,
  actor: User,
  targetUserId: string,
  newPassword: string,
) {
  if (newPassword.length < 6) {
    throw new ValidationError("رمز حداقل ۶ کاراکتر باشد");
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
