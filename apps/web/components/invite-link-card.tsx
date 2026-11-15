"use client";

import { useState } from "react";

export function InviteLinkCard({
  code,
  link,
}: {
  code: string;
  link: string;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(kind: "code" | "link", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="invite-link-card">
      <div className="invite-link-card-head">
        <span className="material-symbols-outlined invite-link-icon">
          link
        </span>
        <div>
          <div className="invite-link-title">لینک دعوت آماده است</div>
          <p className="muted invite-link-sub">
            این لینک را برای عضو جدید بفرستید · انقضا ۴۸ ساعت · یک‌بارمصرف
          </p>
        </div>
      </div>

      <div className="invite-link-row">
        <span className="invite-link-label">کد دعوت</span>
        <code className="invite-link-code" dir="ltr">
          {code}
        </code>
        <button
          type="button"
          className="btn"
          onClick={() => copy("code", code)}
        >
          <span className="material-symbols-outlined icon-18">
            {copied === "code" ? "check" : "content_copy"}
          </span>
          {copied === "code" ? "کپی شد" : "کپی کد"}
        </button>
      </div>

      <div className="invite-link-row invite-link-row-link">
        <span className="invite-link-label">لینک تلگرام</span>
        <a
          className="invite-link-url"
          href={link}
          target="_blank"
          rel="noreferrer"
          dir="ltr"
        >
          {link}
        </a>
        <div className="invite-link-actions">
          <button
            type="button"
            className="btn"
            onClick={() => copy("link", link)}
          >
            <span className="material-symbols-outlined icon-18">
              {copied === "link" ? "check" : "content_copy"}
            </span>
            {copied === "link" ? "کپی شد" : "کپی لینک"}
          </button>
          <a
            className="btn primary"
            href={link}
            target="_blank"
            rel="noreferrer"
          >
            <span className="material-symbols-outlined icon-18">open_in_new</span>
            باز کردن بات
          </a>
        </div>
      </div>
    </div>
  );
}
