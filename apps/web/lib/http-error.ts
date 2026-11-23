import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import {
  classifyPublicError,
  parseErrorCode,
  publicError,
  publicErrorJson,
  type PublicError,
  type PublicErrorCode,
} from "@eth/core/errors";

export function isNextInterrupt(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const digest = String((err as { digest?: string }).digest ?? "");
  return (
    digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND")
  );
}

export function rethrowNext(err: unknown): void {
  if (isNextInterrupt(err)) throw err;
}

export function toPublicError(
  codeOrErr: PublicErrorCode | unknown,
  messageOverride?: string,
): PublicError {
  if (typeof codeOrErr === "string") {
    const code = parseErrorCode(codeOrErr) ?? "INTERNAL";
    return publicError(code, messageOverride);
  }
  return classifyPublicError(codeOrErr);
}

export function jsonError(
  codeOrErr: PublicErrorCode | unknown,
  init?: { message?: string; headers?: HeadersInit; retryAfter?: number },
): NextResponse {
  const body = toPublicError(codeOrErr, init?.message);
  return NextResponse.json(publicErrorJson(body, { retryAfter: init?.retryAfter }), {
    status: body.status,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
}

export function failAction(returnTo: string, err: unknown): never {
  rethrowNext(err);
  const body = classifyPublicError(err);
  const hashIndex = returnTo.indexOf("#");
  const hash = hashIndex >= 0 ? returnTo.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? returnTo.slice(0, hashIndex) : returnTo;
  const url = new URL(withoutHash, "http://local.invalid");
  url.searchParams.set("error", body.code);
  if (body.code === "VALIDATION" && body.message !== publicError("VALIDATION").message) {
    url.searchParams.set("error", body.message);
  }
  redirect(`${url.pathname}${url.search}${hash}`);
}

export async function runAction(
  returnTo: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    failAction(returnTo, err);
  }
}
