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
import { getSessionUser } from "@/lib/session";
import { notifyEditorInvoiceIssued } from "@/lib/telegram-bot";
import { toUserError } from "@/lib/user-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !can(user, "invoice.manage")) {
    return NextResponse.json(
      { error: "نشست شما منقضی شده. دوباره وارد شوید." },
      { status: 401 },
    );
  }

  let body: {
    userId?: string;
    periodKey?: string;
    taskIds?: string[];
    issue?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه نامعتبر" }, { status: 400 });
  }

  const userId = String(body.userId ?? "").trim();
  const periodKey = String(body.periodKey ?? "").trim();
  const taskIds = Array.isArray(body.taskIds)
    ? body.taskIds.map(String)
    : [];
  const issue = Boolean(body.issue);

  if (!userId || !periodKey) {
    return NextResponse.json(
      { error: "ادیتور و ماه الزامی است" },
      { status: 400 },
    );
  }

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
    console.error("compose invoice failed:", err);
    return NextResponse.json(
      { error: toUserError(err, "خطا در ساخت فاکتور شخصی") },
      { status: 400 },
    );
  }
}
