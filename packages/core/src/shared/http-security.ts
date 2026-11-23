/** UUID v1–v8 (rejects nil and malformed strings). */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Jalali YYYY-MM used as invoice period keys. */
export function isJalaliPeriodKey(value: string): boolean {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  return year >= 1300 && year <= 1600;
}

/** Same-origin relative path only — blocks protocol-relative and open redirects. */
export function isSafeRedirectPath(path: string): boolean {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !path.includes("://")
  );
}

export function parseOriginHost(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * CSRF gate for state-changing requests.
 * `cross-site` is always denied. Same-origin fetch/form is allowed.
 * If Sec-Fetch-Site is missing, Origin/Referer must match a trusted host.
 */
export function originAllowed(
  requestOrigin: string | null,
  referer: string | null,
  secFetchSite: string | null,
  trustedHosts: string[],
): boolean {
  const trusted = new Set(
    trustedHosts.map((h) => h.trim().toLowerCase()).filter(Boolean),
  );
  const site = (secFetchSite ?? "").toLowerCase();
  if (site === "cross-site") return false;
  if (site === "same-origin" || site === "same-site") return true;

  const originHost = requestOrigin ? parseOriginHost(requestOrigin) : null;
  if (originHost) return trusted.has(originHost);

  const refererHost = referer ? parseOriginHost(referer) : null;
  if (refererHost) return trusted.has(refererHost);

  return false;
}

export type ImageKind = "png" | "jpeg" | "gif" | "webp";

export const IMAGE_MIME: Record<ImageKind, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export function sniffImageKind(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null;
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "gif";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}
