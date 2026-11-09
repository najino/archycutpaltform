import { InlineKeyboard, InputFile } from "grammy";
import {
  can,
  currentMonthPeriod,
  formatToman,
  generateInvoicesForPeriod,
  getAgencySettings,
  getInvoiceDetail,
  issueInvoice,
  listInvoices,
  listMembers,
  markInvoicePaid,
  parsePeriodKey,
  previousMonthPeriod,
} from "@eth/core";
import { renderInvoicePdf } from "@eth/invoice-pdf";
import type { BotContext } from "../context.js";
import { env } from "../env.js";
import { notifyAdminGroup } from "../notify.js";

export async function invoicesCommand(ctx: BotContext) {
  if (!ctx.user) return;
  if (!can(ctx.user, "invoice.manage")) {
    await ctx.reply("فقط ادمین. برای فاکتور خودتان /invoice را بزنید.");
    return;
  }

  const arg = ctx.message?.text?.split(/\s+/)[1];
  const periodKey = arg
    ? parsePeriodKey(arg).periodKey
    : currentMonthPeriod().periodKey;

  let invoices = await listInvoices(ctx.db, ctx.user, periodKey);
  if (invoices.length === 0) {
    invoices = await generateInvoicesForPeriod(
      ctx.db,
      ctx.user,
      parsePeriodKey(periodKey),
      "bot",
    );
  }

  if (invoices.length === 0) {
    await ctx.reply(`فاکتوری برای ${periodKey} نیست.`);
    return;
  }

  const members = await listMembers(ctx.db);
  const names = new Map(members.map((m) => [m.id, m.displayName]));

  for (const inv of invoices.slice(0, 15)) {
    const kb = new InlineKeyboard();
    if (inv.status === "draft") kb.text("Issue", `inv_issue:${inv.id}`);
    if (inv.status === "issued") kb.text("Mark paid", `inv_pay:${inv.id}`);
    kb.text("PDF", `inv_pdf:${inv.id}`);
    await ctx.reply(
      `<b>${inv.number}</b> · ${names.get(inv.userId) ?? ""}\n${formatToman(inv.totalAmount)} · ${inv.status}`,
      { parse_mode: "HTML", reply_markup: kb },
    );
  }
}

export async function invoiceCommand(ctx: BotContext) {
  if (!ctx.user) return;
  const invoices = await listInvoices(ctx.db, ctx.user);
  const mine = invoices
    .filter((i) => i.userId === ctx.user!.id && i.status !== "void")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const latest = mine[0];
  if (!latest) {
    await ctx.reply("فاکتوری ندارید.");
    return;
  }
  await sendInvoiceToUser(ctx, latest.id);
}

export async function sendInvoiceToUser(ctx: BotContext, invoiceId: string) {
  if (!ctx.user) return;
  const detail = await getInvoiceDetail(ctx.db, ctx.user, invoiceId);
  const agency = await getAgencySettings(ctx.db);
  const pdf = await renderInvoicePdf({
    agencyName: agency.name,
    agencyLogoUrl: agency.logoUrl,
    number: detail.invoice.number,
    periodKey: detail.invoice.periodKey,
    editorName: detail.editor?.displayName ?? "",
    status: detail.invoice.status,
    issuedAt: detail.invoice.issuedAt,
    totalAmount: detail.invoice.totalAmount,
    lines: detail.lines.map((l) => ({
      projectName: l.projectName,
      description: l.description,
      units: Number(l.units),
      unitPrice: l.unitPrice,
      amount: l.amount,
    })),
  });

  const summary = `📄 ${detail.invoice.number}\nدوره ${detail.invoice.periodKey}\n${formatToman(detail.invoice.totalAmount)}\nوضعیت: ${detail.invoice.status}`;
  await ctx.reply(summary);
  const msg = await ctx.replyWithDocument(
    new InputFile(pdf, `${detail.invoice.number}.pdf`),
  );
  return msg.message_id;
}

export async function handleInvoiceCallbacks(ctx: BotContext) {
  const data = ctx.callbackQuery?.data ?? "";
  if (!ctx.user) return;

  if (data.startsWith("inv_issue:")) {
    if (!can(ctx.user, "invoice.manage")) {
      await ctx.answerCallbackQuery({ text: "Forbidden", show_alert: true });
      return;
    }
    const id = data.slice("inv_issue:".length);
    const inv = await issueInvoice(ctx.db, ctx.user, id, "bot");
    await ctx.answerCallbackQuery({ text: "Issued" });
    await ctx.editMessageText(`✅ ${inv.number} issued`);

    // deliver privately to editor
    const members = await listMembers(ctx.db);
    const editor = members.find((m) => m.id === inv.userId);
    if (editor) {
      try {
        const agency = await getAgencySettings(ctx.db);
        const detail = await getInvoiceDetail(ctx.db, ctx.user, inv.id);
        const pdf = await renderInvoicePdf({
          agencyName: agency.name,
          agencyLogoUrl: agency.logoUrl,
          number: inv.number,
          periodKey: inv.periodKey,
          editorName: editor.displayName,
          status: inv.status,
          issuedAt: inv.issuedAt,
          totalAmount: inv.totalAmount,
          lines: detail.lines.map((l) => ({
            projectName: l.projectName,
            description: l.description,
            units: Number(l.units),
            unitPrice: l.unitPrice,
            amount: l.amount,
          })),
        });
        await ctx.api.sendMessage(
          editor.telegramId.toString(),
          `📄 فاکتور ${inv.number}\n${formatToman(inv.totalAmount)}`,
        );
        await ctx.api.sendDocument(
          editor.telegramId.toString(),
          new InputFile(pdf, `${inv.number}.pdf`),
        );
      } catch (err) {
        console.error("Failed to deliver invoice to editor", err);
      }
    }
    return;
  }

  if (data.startsWith("inv_pay:")) {
    if (!can(ctx.user, "invoice.pay") && !can(ctx.user, "invoice.manage")) {
      // admin can try; owner has pay
      if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
        await ctx.answerCallbackQuery({ text: "Forbidden", show_alert: true });
        return;
      }
    }
    const id = data.slice("inv_pay:".length);
    try {
      if (!can(ctx.user, "invoice.pay")) {
        await ctx.answerCallbackQuery({ text: "Forbidden", show_alert: true });
        return;
      }
      const inv = await markInvoicePaid(ctx.db, ctx.user, id, "bot");
      await ctx.answerCallbackQuery({ text: "Paid" });
      await ctx.editMessageText(`💰 ${inv.number} paid`);
    } catch (err) {
      await ctx.answerCallbackQuery({
        text: err instanceof Error ? err.message : "Error",
        show_alert: true,
      });
    }
    return;
  }

  if (data.startsWith("inv_pdf:")) {
    const id = data.slice("inv_pdf:".length);
    await ctx.answerCallbackQuery({ text: "Generating…" });
    await sendInvoiceToUser(ctx, id);
  }
}

/** Monthly job: previous Gregorian month */
export async function runMonthlyInvoiceJob(botApi: BotContext["api"], db: BotContext["db"]) {
  const period = previousMonthPeriod();
  const owners = (await listMembers(db)).filter((m) => m.role === "owner");
  const actor = owners[0] ?? null;
  const invoices = await generateInvoicesForPeriod(db, actor, period, "system");

  const members = await listMembers(db);
  const names = new Map(members.map((m) => [m.id, m.displayName]));
  let grand = 0n;
  const lines = invoices.map((inv) => {
    grand += inv.totalAmount;
    return `• ${names.get(inv.userId) ?? inv.userId}: ${formatToman(inv.totalAmount)} (${inv.number})`;
  });

  const kb = new InlineKeyboard().url(
    "Review on web",
    `${env.webBaseUrl}/invoices?month=${period.periodKey}`,
  );
  for (const inv of invoices) {
    if (inv.status === "draft") kb.text(`Issue ${inv.number}`, `inv_issue:${inv.id}`).row();
  }

  await notifyAdminGroup(
    botApi,
    `🧾 فاکتور ماه ${period.periodKey}\n${lines.join("\n") || "خالی"}\nجمع: ${formatToman(grand)}`,
    kb,
  );

  return invoices;
}
