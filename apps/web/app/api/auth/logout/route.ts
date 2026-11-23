import { NextResponse } from "next/server";
import { parseOriginHost } from "@eth/core/security";
import { destroySession } from "@/lib/session";

function logoutOrigin(req: Request): string {
  const base = process.env.WEB_BASE_URL;
  if (base && parseOriginHost(base)) return base.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin && parseOriginHost(origin)) return origin;
  return "http://localhost:3010";
}

export async function POST(req: Request) {
  await destroySession();
  return NextResponse.redirect(
    new URL("/login?portal=editor", logoutOrigin(req)),
    303,
  );
}
