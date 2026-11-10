"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Option = { id: string; name: string };

const VIDEO_TYPES = [
  { value: "reels", label: "Reels" },
  { value: "shorts", label: "Shorts" },
  { value: "youtube_long", label: "YouTube long" },
  { value: "other", label: "Other" },
] as const;

const MAX_BYTES = 49 * 1024 * 1024;

export function DeliverableUpload({
  taskId,
  defaultTitle,
  defaultCategoryId,
  defaultClientId,
  defaultVideoType,
  categories,
  clients,
  disabled,
  telegramSubmitUrl,
  shortCode,
}: {
  taskId: string;
  defaultTitle: string;
  defaultCategoryId?: string | null;
  defaultClientId?: string | null;
  defaultVideoType?: string | null;
  categories: Option[];
  clients: Option[];
  disabled?: boolean;
  telegramSubmitUrl?: string | null;
  shortCode?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "upload" | "publish" | "done">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) {
      setFileName(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("حداکثر حجم فایل ۴۹ مگابایت است");
      e.target.value = "";
      setFileName(null);
      return;
    }
    setFileName(file.name);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled || busy) return;
    setError(null);

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      setError("یک فایل ویدیو انتخاب کنید");
      return;
    }

    setBusy(true);
    setPhase("upload");
    setProgress(0);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/tasks/${taskId}/submit`);
        xhr.responseType = "json";

        xhr.upload.onprogress = (ev) => {
          if (!ev.lengthComputable) return;
          const pct = Math.round((ev.loaded / ev.total) * 85);
          setProgress(pct);
          if (pct >= 84) setPhase("publish");
        };

        xhr.onload = () => {
          const data = xhr.response as
            | { ok?: boolean; error?: string }
            | null;
          if (xhr.status >= 200 && xhr.status < 300 && data?.ok) {
            setPhase("publish");
            setProgress(100);
            resolve();
            return;
          }
          reject(
            new Error(
              data?.error ||
                (typeof xhr.response === "string"
                  ? xhr.response
                  : `خطای سرور (${xhr.status})`),
            ),
          );
        };

        xhr.onerror = () => reject(new Error("خطای شبکه هنگام آپلود"));
        xhr.onabort = () => reject(new Error("آپلود لغو شد"));

        // بعد از اتمام بایت‌ها، تا پاسخ تلگرام در فاز publish بمانیم
        xhr.upload.onload = () => {
          setPhase("publish");
          setProgress((p) => Math.max(p, 88));
        };

        xhr.send(fd);
      });

      setPhase("done");
      setProgress(100);
      router.refresh();
      if (inputRef.current) inputRef.current.value = "";
      setFileName(null);
      setTimeout(() => {
        setPhase("idle");
        setProgress(0);
        setBusy(false);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "آپلود ناموفق");
      setPhase("idle");
      setProgress(0);
      setBusy(false);
    }
  }

  const phaseLabel =
    phase === "upload"
      ? "در حال آپلود…"
      : phase === "publish"
        ? "در حال انتشار در کانال تلگرام…"
        : phase === "done"
          ? "منتشر شد"
          : null;

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 16 }}>
      {telegramSubmitUrl && (
        <div
          className="info-banner"
          style={{
            marginBottom: 0,
            borderRight: "2px solid var(--primary)",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span
              className="material-symbols-outlined"
              style={{ color: "var(--tertiary)", fontSize: 22 }}
            >
              smart_toy
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                فایل حجیم؟ از تلگرام بفرستید
              </div>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
                برای ویدیوهای بالای ۴۹MB، ارسال از ربات بدون محدودیت آپلود سرور
                انجام می‌شود
                {shortCode ? (
                  <>
                    {" "}
                    (تسک{" "}
                    <span className="font-mono" style={{ color: "var(--primary)" }}>
                      {shortCode}
                    </span>{" "}
                    از قبل انتخاب می‌شود).
                  </>
                ) : (
                  "."
                )}
              </p>
            </div>
          </div>
          <a
            className="btn primary"
            href={telegramSubmitUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: "100%", textDecoration: "none" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              send
            </span>
            باز کردن ربات و ارسال فایل
          </a>
        </div>
      )}

      <div
        style={{
          height: 1,
          background: "rgba(16,185,129,0.12)",
        }}
      />

      <div style={{ fontWeight: 600, fontSize: 13 }}>
        آپلود مستقیم از وب (تا ۴۹MB)
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
        فایل ویدیو
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept="video/*,.mp4,.mov,.m4v,.webm,.mkv"
          required
          disabled={disabled || busy}
          onChange={onFileChange}
        />
        {fileName && (
          <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {fileName}
          </span>
        )}
      </label>

      {(busy || phase === "done") && (
        <div className="upload-progress" aria-live="polite">
          <div className="upload-progress-meta">
            <span>{phaseLabel}</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="upload-progress-track">
            <div
              className={`upload-progress-fill${phase === "publish" ? " pulse" : ""}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}

      <button
        className="btn primary"
        type="submit"
        disabled={disabled || busy || categories.length === 0}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          upload
        </span>
        {busy ? "در حال ارسال…" : "آپلود و انتشار در کانال"}
      </button>

      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        فایل مستقیم به کانال پورتفولیو تلگرام ارسال می‌شود و وضعیت تسک به
        delivered تغییر می‌کند. حداکثر ۴۹ مگابایت.
      </p>
    </form>
    </div>
  );
}
