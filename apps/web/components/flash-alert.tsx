"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FlashTone } from "@/lib/flash";

const ICONS: Record<FlashTone, string> = {
  success: "check_circle",
  error: "error",
  info: "info",
  warning: "warning",
};

export function FlashAlert({
  tone,
  title,
  detail,
  clearKeys = [],
  autoHideMs = 5200,
}: {
  tone: FlashTone;
  title: string;
  detail?: string;
  /** کلیدهای query که بعد از نمایش از URL پاک شوند */
  clearKeys?: string[];
  autoHideMs?: number;
}) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!open || clearKeys.length === 0) return;
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of clearKeys) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (!changed) return;
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [open, clearKeys, router]);

  useEffect(() => {
    if (!open || autoHideMs <= 0) return;
    const t = window.setTimeout(() => setOpen(false), autoHideMs);
    return () => window.clearTimeout(t);
  }, [open, autoHideMs]);

  if (!open) return null;

  return (
    <div
      className={`flash-alert flash-alert-${tone}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <span className="material-symbols-outlined flash-alert-icon" aria-hidden>
        {ICONS[tone]}
      </span>
      <div className="flash-alert-body">
        <div className="flash-alert-title">{title}</div>
        {detail ? <p className="flash-alert-detail">{detail}</p> : null}
      </div>
      <button
        type="button"
        className="flash-alert-close"
        aria-label="بستن"
        onClick={() => setOpen(false)}
      >
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  );
}
