import { NextResponse } from "next/server";
import {
  getAgencySettings,
  getInvoiceDetail,
  isClientUser,
  isUuid,
} from "@eth/core";
import { renderInvoicePdf, toInvoicePdfInput } from "@eth/invoice-pdf";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http-error";
import { getSessionUser } from "@/lib/session";
import { limitUserRequest, rateLimitedJson } from "@/lib/rate-limit";
import { logSecurity } from "@/lib/security-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pdfErrorResponse(err: unknown) {
  logSecurity("pdf_failed");
  return jsonError(err);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || !user.isActive) {
    return jsonError("UNAUTHORIZED");
  }

  const limited = limitUserRequest(req, user.id, "invoice-pdf", 30, 15 * 60_000);
  if (!limited.ok) {
    return rateLimitedJson("invoice-pdf", limited.retryAfterSec);
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return jsonError("NOT_FOUND", { message: "فاکتور پیدا نشد." });
  }

  const inline = new URL(req.url).searchParams.get("inline") === "1";

  try {
    const [detail, agency] = await Promise.all([
      getInvoiceDetail(db(), user, id),
      getAgencySettings(db()),
    ]);
    const isClient = isClientUser(user);
    const total = isClient
      ? (detail.clientAmount ?? detail.invoice.totalAmount)
      : detail.invoice.totalAmount;

    const pdf = await renderInvoicePdf(
      toInvoicePdfInput({
        agencyName: agency.name,
        agencyLogoUrl: agency.logoUrl,
        invoice: detail.invoice,
        lines: detail.lines,
        editorName: isClient
          ? user.displayName
          : (detail.editor?.displayName ?? "—"),
        partyLabel: isClient ? "کارفرما" : "ادیتور",
        totalAmount: total,
      }),
    );

    const filename = `${detail.invoice.number.replace(/[^\w.-]+/g, "_")}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return pdfErrorResponse(err);
  }
}
