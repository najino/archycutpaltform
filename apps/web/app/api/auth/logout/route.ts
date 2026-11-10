import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST() {
  await destroySession();
  return NextResponse.redirect(
    new URL("/login?portal=editor", process.env.WEB_BASE_URL ?? "http://localhost:3000"),
    303,
  );
}
