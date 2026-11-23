import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { User } from "@eth/db";
import { getUserById } from "@eth/core";
import { db } from "./db";
import { logSecurity } from "./security-log";

const COOKIE = "eth_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}

function cookieSecure() {
  if (process.env.NODE_ENV === "production") return true;
  return process.env.WEB_BASE_URL?.startsWith("https://") === true;
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
    expires: new Date(Date.now() + MAX_AGE_SEC * 1000),
  };
}

export async function createSession(userId: string) {
  const jar = await cookies();
  jar.delete(COOKIE);

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  jar.set(COOKIE, token, sessionCookieOptions());
}

export async function destroySession() {
  const jar = await cookies();
  jar.set(COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = payload.sub;
    if (!userId) return null;
    const user = await getUserById(db(), userId);
    if (!user || !user.isActive) return null;
    return user;
  } catch {
    logSecurity("invalid_session");
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user || !user.isActive) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
