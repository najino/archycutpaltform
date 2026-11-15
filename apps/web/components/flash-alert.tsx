"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type FlashTone = "success" | "error" | "info" | "warning";

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

/** نقشهٔ پیام‌های رایج از query `ok` / `error` / `logoError` */
export function resolveFlash(sp: {
  ok?: string;
  error?: string;
  logoError?: string;
}): {
  tone: FlashTone;
  title: string;
  detail?: string;
  clearKeys: string[];
} | null {
  if (sp.logoError === "size") {
    return {
      tone: "error",
      title: "آپلود لوگو ناموفق",
      detail: "حجم فایل بیش از ۲ مگابایت است.",
      clearKeys: ["logoError"],
    };
  }
  if (sp.logoError === "type") {
    return {
      tone: "error",
      title: "آپلود لوگو ناموفق",
      detail: "فقط تصویر PNG، JPG یا WEBP مجاز است.",
      clearKeys: ["logoError"],
    };
  }

  if (sp.error) {
    return {
      tone: "error",
      title: "خطا",
      detail: sp.error,
      clearKeys: ["error"],
    };
  }

  const okMap: Record<string, { title: string; detail?: string }> = {
    agency: {
      title: "سربرگ ذخیره شد",
      detail: "نام و لوگوی فاکتور به‌روزرسانی شد.",
    },
    category: {
      title: "دسته اضافه شد",
      detail: "دستهٔ جدید در فهرست قرار گرفت.",
    },
    client: {
      title: "کارفرما اضافه شد",
      detail: "کارفرمای جدید ذخیره شد.",
    },
    password: {
      title: "رمز ذخیره شد",
      detail: "رمز عبور با موفقیت تغییر کرد.",
    },
    invite: {
      title: "لینک دعوت ساخته شد",
      detail: "لینک را برای عضو جدید بفرستید.",
    },
    task: {
      title: "تسک ساخته شد",
      detail: "تسک جدید به برد اضافه شد.",
    },
    status: {
      title: "وضعیت به‌روز شد",
      detail: "تغییر وضعیت با موفقیت اعمال شد.",
    },
    project: {
      title: "پروژه ذخیره شد",
      detail: "اطلاعات پروژه به‌روزرسانی شد.",
    },
    project_status: {
      title: "وضعیت پروژه تغییر کرد",
    },
    receipt: {
      title: "فیش ذخیره شد",
      detail: "متن فیش پرداختی ثبت شد؛ هنوز تأیید نهایی نشده.",
    },
    paid: {
      title: "پرداخت تأیید نهایی شد",
      detail: "فاکتور قفل شد و دیگر قابل ویرایش نیست.",
    },
    invoice: {
      title: "فاکتور ثبت شد",
      detail: "فاکتور برای ادیتور صادر شد.",
    },
    void: {
      title: "فاکتور باطل شد",
      detail: "پیش‌نویس/فاکتور از وضعیت فعال خارج شد.",
    },
  };

  if (sp.ok && okMap[sp.ok]) {
    return {
      tone: "success",
      ...okMap[sp.ok],
      clearKeys: ["ok"],
    };
  }

  return null;
}
