import "dotenv/config";
import { Bot } from "grammy";
import { getDb } from "@eth/db";
import { env } from "./env.js";
import { runMonthlyInvoiceJob } from "./commands/invoices.js";

/**
 * Run on 1st of each Gregorian month at 09:00 Asia/Tehran.
 * Example cron (Tehran): 0 9 1 * *
 */
async function main() {
  const db = getDb(env.databaseUrl);
  const bot = new Bot(env.botToken);
  const invoices = await runMonthlyInvoiceJob(bot.api, db);
  console.log(`Monthly invoices: ${invoices.length} for previous month`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
