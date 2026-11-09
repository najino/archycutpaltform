import "./load-env.js";
import { eq } from "drizzle-orm";
import { randomBytes, scryptSync } from "node:crypto";
import { getDb } from "./client.js";
import { categories, clients, taskCounters, users } from "./schema.js";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const db = getDb();

  await db
    .insert(taskCounters)
    .values({ id: 1, lastValue: 0 })
    .onConflictDoNothing();

  const ownerTelegramId = process.env.OWNER_TELEGRAM_ID?.trim();
  const ownerPassword = process.env.OWNER_PASSWORD?.trim() || "admin123";

  if (!ownerTelegramId) {
    console.warn(
      "OWNER_TELEGRAM_ID is empty — skipped owner user. Set it in .env and re-run seed.",
    );
  } else {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(ownerTelegramId)))
      .limit(1);

    const passwordHash = hashPassword(ownerPassword);

    if (existing.length === 0) {
      await db.insert(users).values({
        telegramId: BigInt(ownerTelegramId),
        displayName: "Owner",
        role: "owner",
        passwordHash,
        isActive: true,
      });
      console.log(`Owner seeded for telegram_id=${ownerTelegramId}`);
    } else {
      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, existing[0]!.id));
      console.log(
        "Owner already exists — password refreshed from OWNER_PASSWORD",
      );
    }
    console.log(
      `Web login: telegram_id=${ownerTelegramId} password=${ownerPassword}`,
    );
  }

  const defaultCategories = [
    { name: "املاک", slug: "real_estate" },
    { name: "فشن", slug: "fashion" },
    { name: "غذا", slug: "food" },
    { name: "گیمینگ", slug: "gaming" },
    { name: "سایر", slug: "other" },
  ];

  for (const cat of defaultCategories) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }

  await db.insert(clients).values({ name: "داخلی" }).onConflictDoNothing();

  console.log("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
