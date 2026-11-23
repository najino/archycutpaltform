import { originAllowed, parseOriginHost } from "@eth/core/security";

const DEV_HOSTS = ["localhost:3010", "127.0.0.1:3010", "localhost:3000"];

export function trustedHostsFromRequest(req: Request): string[] {
  const hosts: string[] = [];
  const host = req.headers.get("host");
  if (host) hosts.push(host);
  const base = process.env.WEB_BASE_URL;
  if (base) {
    const parsed = parseOriginHost(base);
    if (parsed) hosts.push(parsed);
  }
  if (process.env.NODE_ENV !== "production") {
    hosts.push(...DEV_HOSTS);
  }
  return hosts;
}

export function isMutatingMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

export function isTrustedMutation(req: Request): boolean {
  if (!isMutatingMethod(req.method)) return true;
  return originAllowed(
    req.headers.get("origin"),
    req.headers.get("referer"),
    req.headers.get("sec-fetch-site"),
    trustedHostsFromRequest(req),
  );
}

export function allowedActionOrigins(): string[] {
  const hosts = new Set<string>();
  const base = process.env.WEB_BASE_URL;
  if (base) {
    const host = parseOriginHost(base);
    if (host) hosts.add(host);
  }
  if (process.env.NODE_ENV !== "production") {
    for (const h of DEV_HOSTS) hosts.add(h);
  }
  return [...hosts];
}
