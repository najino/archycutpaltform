import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isTrustedMutation } from "@/lib/csrf";
import { jsonError } from "@/lib/http-error";
import { applySecurityHeaders } from "@/lib/secure-headers";

const PUBLIC = [
  "/login",
  "/api/auth/login",
  "/api/auth/telegram",
  "/manifest.webmanifest",
  "/sw.js",
];

function isPublicPath(pathname: string) {
  return (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.svg"
  );
}

function withSecurity(res: NextResponse, nonce: string) {
  applySecurityHeaders(
    res.headers,
    nonce,
    process.env.NODE_ENV !== "production",
  );
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  if (!isTrustedMutation(req)) {
    console.info("[security]", "csrf_rejected", pathname);
    if (pathname.startsWith("/api/") || req.headers.has("next-action")) {
      return withSecurity(jsonError("CSRF"), nonce);
    }
    const url = req.nextUrl.clone();
    url.searchParams.set("error", "CSRF");
    return withSecurity(NextResponse.redirect(url, 303), nonce);
  }

  if (isPublicPath(pathname)) {
    return withSecurity(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce,
    );
  }

  const session = req.cookies.get("eth_session");
  if (!session && !pathname.startsWith("/api/auth")) {
    if (pathname.startsWith("/api/")) {
      return withSecurity(jsonError("UNAUTHORIZED"), nonce);
    }
    return withSecurity(
      NextResponse.redirect(new URL("/login", req.url)),
      nonce,
    );
  }

  return withSecurity(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
