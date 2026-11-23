import { NextResponse } from "next/server";
import {
  getAgencySettings,
  getInvoiceDetail,
  isClientUser,
  isUuid,
  NotFoundError,
  PermissionError,
  ValidationError,
} from "@eth/core";
import { renderInvoicePdf, toInvoicePdfInput } from "@eth/invoice-pdf";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { toUserError } from "@/lib/user-error";
import { limitUserRequest, rateLimitedJson } from "@/lib/rate-limit";
import { logSecurity } from "@/lib/security-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pdfErrorResponse(err: unknown) {
  if (err instanceof PermissionError) {
    logSecurity("pdf_forbidden");
    return NextResponse.json(
      { error: "دسترسی به این فاکتور ندارید" },
      { status: 403 },
    );
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: "فاکتور پیدا نشد" }, { status: 404 });
  }
  if (err instanceof ValidationError) {
    return NextResponse.json(
      { error: toUserError(err, "درخواست نامعتبر است") },
      { status: 400 },
    );
  }
  console.error("invoice pdf");
  return NextResponse.json(
    { error: toUserError(err, "ساخت PDF ناموفق بود") },
    { status: 500 },
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }

  const limited = limitUserRequest(req, user.id, "invoice-pdf", 30, 15 * 60_000);
  if (!limited.ok) {
    return rateLimitedJson("invoice-pdf", limited.retryAfterSec);
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "فاکتور پیدا نشد" }, { status: 404 });
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
