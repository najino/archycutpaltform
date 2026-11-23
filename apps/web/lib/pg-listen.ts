import "server-only";
import postgres from "postgres";

type Handler = (payload: string) => void;

type GlobalListen = {
  __ethListen?: {
    url: string;
    sql: ReturnType<typeof postgres>;
    handlers: Set<Handler>;
  };
};

const g = globalThis as unknown as GlobalListen;

/**
 * One shared LISTEN connection for the whole Node process.
 * Avoids opening a new Postgres client per SSE tab (connection leak).
 */
export function subscribePgEvents(
  url: string,
  handler: Handler,
): () => void {
  if (!g.__ethListen || g.__ethListen.url !== url) {
    if (g.__ethListen) {
      void g.__ethListen.sql.end({ timeout: 1 });
    }
    const handlers = new Set<Handler>();
    const sql = postgres(url, {
      max: 1,
      idle_timeout: 0,
      max_lifetime: 0,
      connect_timeout: 10,
    });
    void sql.listen("events", (payload) => {
      for (const h of [...handlers]) {
        try {
          h(payload);
        } catch {
          /* ignore handler errors */
        }
      }
    });
    g.__ethListen = { url, sql, handlers };
  }

  g.__ethListen.handlers.add(handler);
  return () => {
    g.__ethListen?.handlers.delete(handler);
  };
}
