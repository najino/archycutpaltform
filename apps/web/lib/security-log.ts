import "server-only";

/** Security events only — never pass passwords, tokens, cookies, or raw bodies. */
export function logSecurity(
  event: string,
  extra?: Record<string, string | number | boolean | null | undefined>,
) {
  if (extra) {
    console.info("[security]", event, extra);
    return;
  }
  console.info("[security]", event);
}
