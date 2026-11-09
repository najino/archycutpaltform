import postgres from "postgres";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    return new Response("DATABASE_URL missing", { status: 500 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let sql: ReturnType<typeof postgres> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      send("ready", "{}");

      sql = postgres(url, { max: 1, idle_timeout: 0, max_lifetime: 0 });
      void sql.listen("events", (payload) => {
        try {
          const parsed = JSON.parse(payload) as { type?: string };
          send(parsed.type ?? "message", payload);
        } catch {
          send("message", payload);
        }
      });

      heartbeat = setInterval(() => {
        send("ping", "{}");
      }, 25000);
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      void sql?.end({ timeout: 1 });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
