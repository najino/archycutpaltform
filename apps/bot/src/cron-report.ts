import "dotenv/config";
import { Bot } from "grammy";
import { getDb, users } from "@eth/db";
import { currentWeekKey, getTeamWeekStats } from "@eth/core";
import { eq } from "drizzle-orm";
import { env } from "./env.js";

/** Sunday 10:00 Asia/Tehran weekly summary — run via system cron */
async function main() {
  if (!env.adminGroupId) {
    console.log("TELEGRAM_ADMIN_GROUP_ID not set; skip");
    return;
  }
  const db = getDb(env.databaseUrl);
  const owner = (
    await db.select().from(users).where(eq(users.role, "owner")).limit(1)
  )[0];
  if (!owner) throw new Error("No owner");

  const weekKey = currentWeekKey();
  const stats = await getTeamWeekStats(db, owner, weekKey);
  const lines = stats.map(
    (s) =>
      `• ${s.displayName}: ${s.total} total · ${s.delivered} delivered · ${s.approved} approved`,
  );
  const bot = new Bot(env.botToken);
  await bot.api.sendMessage(
    env.adminGroupId.toString(),
    `📈 گزارش هفتگی ${weekKey}\n${lines.join("\n") || "خالی"}`,
  );
  console.log("Report sent");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
