import { NextResponse } from "next/server";
import {
  can,
  createPersonalizedInvoice,
  formatToman,
  getInvoiceById,
  jalaliMonthLabel,
  listMembers,
} from "@eth/core";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http-error";
import { getSessionUser } from "@/lib/session";
import { notifyEditorInvoiceIssued } from "@/lib/telegram-bot";
import { limitUserRequest, rateLimitedJson } from "@/lib/rate-limit";
import { logSecurity } from "@/lib/security-log";
import { composeInvoiceSchema, parseJsonBody } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !user.isActive) {
    return jsonError("UNAUTHORIZED");
  }
  if (!can(user, "invoice.manage")) {
    logSecurity("compose_forbidden", { userId: user.id });
    return jsonError("FORBIDDEN");
  }

  const limited = limitUserRequest(request, user.id, "compose", 20, 15 * 60_000);
  if (!limited.ok) {
    return rateLimitedJson("compose", limited.retryAfterSec);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("BAD_REQUEST");
  }

  const parsed = parseJsonBody(composeInvoiceSchema, raw);
  if (!parsed.ok) {
    return jsonError("VALIDATION", { message: "ادیتور و ماه الزامی است" });
  }
  const { userId, periodKey, taskIds, issue } = parsed.data;

  try {
    const invoice = await createPersonalizedInvoice(
      db(),
      user,
      { userId, periodKey, taskIds, issue },
      "web",
    );

    if (issue) {
      const members = await listMembers(db());
      const editor = members.find((m) => m.id === userId);
      const fresh = (await getInvoiceById(db(), invoice.id)) ?? invoice;
      const base =
        process.env.WEB_BASE_URL?.replace(/\/$/, "") ||
        "http://localhost:3010";
      if (editor?.telegramId) {
        await notifyEditorInvoiceIssued({
          telegramId: editor.telegramId,
          invoiceNumber: fresh.number,
          periodLabel: jalaliMonthLabel(fresh.periodKey),
          totalLabel: formatToman(fresh.totalAmount),
          webUrl: `${base}/invoices/${fresh.id}`,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      invoiceId: invoice.id,
      status: invoice.status,
      number: invoice.number,
      totalAmount: invoice.totalAmount.toString(),
    });
  } catch (err) {
    logSecurity("compose_failed", { userId: user.id });
    return jsonError(err);
  }
}
