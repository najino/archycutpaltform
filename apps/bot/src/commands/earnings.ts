import {
  can,
  currentMonthPeriod,
  formatToman,
  monthlyEarnings,
  parsePeriodKey,
  jalaliMonthLabel,
  toPersianDigits,
} from "@eth/core";
import type { BotContext } from "../context.js";

export async function earningsCommand(ctx: BotContext) {
  if (!ctx.user) return;
  const arg = ctx.message?.text?.split(/\s+/)[1];
  let periodKey = currentMonthPeriod().periodKey;
  if (arg) {
    try {
      periodKey = parsePeriodKey(arg).periodKey;
    } catch {
      await ctx.reply("فرمت ماه شمسی: YYYY-MM (مثلاً 1404-08)");
      return;
    }
  }

  const onlyMine = !can(ctx.user, "earnings.view_all");
  const rows = await monthlyEarnings(
    ctx.db,
    ctx.user,
    periodKey,
    onlyMine ? ctx.user.id : undefined,
  );

  if (rows.length === 0) {
    await ctx.reply(`درآمدی برای ${jalaliMonthLabel(periodKey)} نیست.`);
    return;
  }

  const lines = rows.map(
    (r) =>
      `• ${r.displayName}: ${toPersianDigits(r.approvedCount)} تسک · ${toPersianDigits(r.units)} واحد · ${formatToman(r.amount)}`,
  );
  await ctx.reply(`💰 درآمد ${jalaliMonthLabel(periodKey)}\n${lines.join("\n")}`);
}
