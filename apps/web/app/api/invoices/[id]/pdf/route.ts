import { NextResponse } from "next/server";
import {
  getAgencySettings,
  getInvoiceDetail,
  isClientUser,
  NotFoundError,
  PermissionError,
  ValidationError,
} from "@eth/core";
import { renderInvoicePdf, toInvoicePdfInput } from "@eth/invoice-pdf";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { toUserError } from "@/lib/user-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pdfErrorResponse(err: unknown) {
  console.error("invoice pdf", err);
  if (err instanceof PermissionError) {
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

  const { id } = await params;
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
      },
    });
  } catch (err) {
    return pdfErrorResponse(err);
  }
}
