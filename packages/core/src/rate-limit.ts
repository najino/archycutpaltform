export type RateLimitBucket = { count: number; resetAt: number };
export type RateLimitStore = Map<string, RateLimitBucket>;

const PRUNE_EVERY = 64;
let ops = 0;

export function consumeRateLimit(
  store: RateLimitStore,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  if (++ops % PRUNE_EVERY === 0) {
    for (const [k, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(k);
    }
  }

  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true };
}
