export type FlashTone = "success" | "error" | "info" | "warning";

export type FlashMessage = {
  tone: FlashTone;
  title: string;
  detail?: string;
  clearKeys: string[];
};

/** نقشهٔ پیام‌های رایج از query `ok` / `error` / `logoError` */
export function resolveFlash(sp: {
  ok?: string;
  error?: string;
  logoError?: string;
}): FlashMessage | null {
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
