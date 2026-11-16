import { NextResponse } from "next/server";
import {
  getAgencySettings,
  getInvoiceDetail,
} from "@eth/core";
import { buildInvoiceHtml } from "@eth/invoice-pdf";
import { htmlToPdf } from "@/lib/html-to-pdf";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { toUserError } from "@/lib/user-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }

  const { id } = await params;
  const inline = new URL(req.url).searchParams.get("inline") === "1";

  try {
    const [detail, agency] = await Promise.all([
      getInvoiceDetail(db(), user, id),
      getAgencySettings(db()),
    ]);
    const { invoice, lines, editor, clientAmount } = detail;
    const isClient = user.role === "client";
    const total = isClient
      ? (clientAmount ?? invoice.totalAmount)
      : invoice.totalAmount;

    const pdf = await htmlToPdf(
      buildInvoiceHtml({
        agencyName: agency.name,
        agencyLogoUrl: agency.logoUrl,
        number: invoice.number,
        periodKey: invoice.periodKey,
        editorName: isClient ? user.displayName : (editor?.displayName ?? "—"),
        partyLabel: isClient ? "کارفرما" : "ادیتور",
        status: invoice.status,
        issuedAt: invoice.issuedAt,
        totalAmount: total,
        paymentReceipt: invoice.paymentReceipt,
        lines: lines.map((line) => ({
          projectName: line.projectName,
          description: line.description,
          units: Number(line.units),
          unitPrice: line.unitPrice,
          amount: line.amount,
        })),
      }),
    );

    const filename = `${invoice.number.replace(/[^\w.-]+/g, "_")}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("invoice pdf", err);
    const raw = err instanceof Error ? err.message : "";
    const message =
      /playwright|executable doesn't exist|browserType/i.test(raw)
        ? "موتور ساخت PDF آماده نیست. کمی بعد دوباره تلاش کنید."
        : toUserError(err, "ساخت PDF ناموفق بود");
    const status =
      message.includes("Forbidden") || message.includes("پیدا نشد")
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
