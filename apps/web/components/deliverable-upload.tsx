"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parsePublicErrorPayload } from "@eth/core/errors";
import { InlineError } from "@/components/inline-error";
import { networkPublicError } from "@/lib/api-error";

type Option = { id: string; name: string };

const VIDEO_TYPES = [
  { value: "reels", label: "Reels" },
  { value: "shorts", label: "Shorts" },
  { value: "youtube_long", label: "YouTube long" },
  { value: "other", label: "Other" },
] as const;

export function DeliverableUpload({
  taskId,
  defaultTitle,
  defaultCategoryId,
  defaultClientId,
  defaultVideoType,
  categories,
  clients,
  disabled,
}: {
  taskId: string;
  defaultTitle: string;
  defaultCategoryId?: string | null;
  defaultClientId?: string | null;
  defaultVideoType?: string | null;
  categories: Option[];
  clients: Option[];
  disabled?: boolean;
  /** @deprecated kept for call-site compat */
  telegramSubmitUrl?: string | null;
  shortCode?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "publish" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled || busy) return;
    setError(null);

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const mediaUrl = String(fd.get("mediaUrl") ?? "").trim();
    if (!mediaUrl) {
      setError("لینک ویدیو را وارد کنید");
      return;
    }

    setBusy(true);
    setPhase("publish");

    try {
      const res = await fetch(`/api/tasks/${taskId}/submit`, {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(parsePublicErrorPayload(data, res.status).message);
      }

      setPhase("done");
      formEl.reset();
      router.refresh();
      setTimeout(() => {
        setPhase("idle");
        setBusy(false);
      }, 1000);
    } catch (err) {
      const fallback = networkPublicError();
      setError(err instanceof Error ? err.message : fallback.message);
      setPhase("idle");
      setBusy(false);
    }
  }

  return (
    <div className="deliverable-submit">
      <div className="info-banner deliverable-link-banner">
        <span className="material-symbols-outlined">link</span>
        <div>
          <div className="info-banner-title">تحویل با لینک</div>
          <p className="muted">
            لینک درایو / کلود / پخش را بفرستید؛ متن اطلاعات + لینک در کانال
            پورتفولیو منتشر می‌شود و وضعیت تسک به delivered می‌رود.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="form-grid">
        <label>
          عنوان پورتفولیو
          <input name="title" defaultValue={defaultTitle} required />
        </label>

        <label>
          دسته
          <select
            name="categoryId"
            required
            defaultValue={defaultCategoryId ?? categories[0]?.id ?? ""}
          >
            {categories.length === 0 && <option value="">دسته‌ای نیست</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          کارفرما (اختیاری)
          <select name="clientId" defaultValue={defaultClientId ?? ""}>
            <option value="">بدون کارفرما</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          نوع ویدیو
          <select
            name="videoType"
            defaultValue={defaultVideoType ?? "reels"}
            required
          >
            {VIDEO_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          لینک ویدیو
          <input
            name="mediaUrl"
            type="url"
            required
            disabled={disabled || busy}
            placeholder="https://drive.google.com/... یا لینک پخش"
            dir="ltr"
            className="field-input"
            autoComplete="url"
          />
          <span className="muted deliverable-hint">
            لینک کامل http/https — Google Drive، Dropbox، Frame.io و …
          </span>
        </label>

        {(busy || phase === "done") && (
          <div className="upload-progress" aria-live="polite">
            <div className="upload-progress-meta">
              <span>
                {phase === "publish"
                  ? "در حال انتشار در کانال…"
                  : "منتشر شد"}
              </span>
            </div>
            <div className="upload-progress-track">
              <div
                className={`upload-progress-fill${
                  phase === "publish" ? " pulse" : ""
                }`}
                style={{ width: phase === "done" ? "100%" : "70%" }}
              />
            </div>
          </div>
        )}

        {error ? <InlineError message={error} /> : null}

        <button
          className="btn primary"
          type="submit"
          disabled={disabled || busy || categories.length === 0}
        >
          <span className="material-symbols-outlined icon-18">send</span>
          {busy ? "در حال ارسال…" : "ارسال لینک به کانال"}
        </button>
      </form>
    </div>
  );
}
