"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RealtimeRefetch() {
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource("/api/events");
    const onMessage = () => {
      router.refresh();
    };
    es.addEventListener("task.updated", onMessage);
    es.addEventListener("deliverable.published", onMessage);
    es.onmessage = onMessage;
    return () => es.close();
  }, [router]);

  return null;
}
