"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RealtimeRefetch() {
  const router = useRouter();

  useEffect(() => {
      let es: EventSource | null = null;
      try {
        es = new EventSource("/api/events");
        const onMessage = () => {
          router.refresh();
        };
        es.addEventListener("task.updated", onMessage);
        es.addEventListener("deliverable.published", onMessage);
        es.onmessage = onMessage;
        es.onerror = () => {
          // Silently swallow EventSource errors so they don't bubble to window.onerror
          // and trigger Next.js "[object Event]" dev error overlay.
        };
      } catch {
        // EventSource not supported or blocked
      }
      return () => {
        if (es) {
          es.close();
        }
      };
    }, [router]);

  return null;
}
