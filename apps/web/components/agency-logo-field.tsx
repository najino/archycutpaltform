"use client";

import { useRef, useState } from "react";

const MAX_BYTES = 2 * 1024 * 1024;

export function AgencyLogoField({
  currentUrl,
}: {
  currentUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);

  function onPick(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("فقط فایل تصویر مجاز است (PNG / JPG / WEBP)");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("حداکثر حجم لوگو ۲ مگابایت است");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setRemove(false);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  return (
    <div className="agency-logo-field">
      <input type="hidden" name="keepLogoUrl" value={currentUrl ?? ""} />
      <input type="hidden" name="removeLogo" value={remove ? "1" : "0"} />

      <div className="agency-logo-preview-wrap">
        {preview && !remove ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="لوگو" className="agency-logo-preview" />
        ) : (
          <div className="agency-logo-placeholder">
            <span className="material-symbols-outlined">image</span>
            <span>بدون لوگو</span>
          </div>
        )}
      </div>

      <div className="agency-logo-actions">
        <label className="btn agency-logo-pick">
          <span className="material-symbols-outlined icon-18">upload</span>
          انتخاب تصویر
          <input
            ref={inputRef}
            name="logoFile"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>
        {(preview || currentUrl) && !remove && (
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              setRemove(true);
              setPreview(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            حذف لوگو
          </button>
        )}
        {remove && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setRemove(false);
              setPreview(currentUrl ?? null);
            }}
          >
            بازگردانی
          </button>
        )}
      </div>
      <p className="muted agency-logo-hint">
        آپلود مستقیم تصویر — PNG / JPG / WEBP · حداکثر ۲MB
      </p>
      {error && <p className="login-form-error">{error}</p>}
    </div>
  );
}
