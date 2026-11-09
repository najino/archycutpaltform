import { InlineKeyboard } from "grammy";
import type { Api } from "grammy";
import type { Task, User } from "@eth/db";
import { env } from "./env.js";

export async function notifyAdminGroup(
  api: Api,
  text: string,
  keyboard?: InlineKeyboard,
) {
  if (!env.adminGroupId) return;
  await api.sendMessage(env.adminGroupId.toString(), text, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

export async function notifyTaskAssigned(api: Api, task: Task, assignee: User) {
  try {
    await api.sendMessage(
      assignee.telegramId.toString(),
      `📌 تسک جدید: <b>${task.shortCode}</b>\n${task.title}\nوضعیت: ${task.status}`,
      { parse_mode: "HTML" },
    );
  } catch {
    // user may have not started bot
  }
}

export function approveRejectKeyboard(shortCode: string) {
  return new InlineKeyboard()
    .text("✅ Approve", `approve:${shortCode}`)
    .text("❌ Reject", `reject:${shortCode}`);
}

export async function notifyDelivered(
  api: Api,
  editor: User,
  task: Task,
) {
  await notifyAdminGroup(
    api,
    `📦 <b>${editor.displayName}</b> delivered <code>${task.shortCode}</code>\n${task.title}`,
    approveRejectKeyboard(task.shortCode),
  );
}
