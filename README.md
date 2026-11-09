# Edit Team Hub

پلتفرم داخلی تسک برای تیم ادیت ویدیو. وب‌پنل + ربات تلگرام، یک دیتابیس Postgres، منطق مشترک در `packages/core`. فایل ویدیو روی سرور ذخیره نمی‌شود؛ آپلود فقط داخل تلگرام و انتشار با `copyMessage` به کانال پورتفولیو.

## ساختار

```
apps/web          Next.js panel
apps/bot          grammY bot
packages/db       Drizzle schema + migrations
packages/core     business rules (permissions, tasks, deliverables, …)
packages/telegram caption / deep-link helpers
```

## راه‌اندازی محلی

1. کپی env:

```bash
cp .env.example .env
```

مقادیر لازم: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `OWNER_TELEGRAM_ID`, `SESSION_SECRET`, و در صورت امکان `TELEGRAM_PORTFOLIO_CHANNEL_ID` / `TELEGRAM_ADMIN_GROUP_ID`.

2. Postgres:

```bash
docker compose up -d postgres
```

3. نصب و مایگریت:

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
```

4. اجرا:

```bash
pnpm dev
```

- وب: http://localhost:3000  
- ربات: long polling (`BOT_MODE=polling`)

## جریان‌های اصلی

- عضو شدن: `/start <invite_code>` در ربات (ادمین با `/invite editor|admin` یا از Settings وب)
- ورود وب: Telegram Login Widget (کاربر باید از قبل عضو باشد)
- تحویل فایل: فقط `/submit` در تلگرام → کپی به کانال → `status=delivered`
- Approve/Reject: وب یا دکمه اینلاین / دستورات `/approve` `/reject`
- پروژه‌ها و درآمد: ادمین پروژه با قیمت واحد می‌سازد (`/project` یا صفحه Projects)؛ با approve مبلغ snapshot می‌شود؛ فاکتور ماهانه میلادی با `pnpm --filter @eth/bot exec tsx src/cron-invoices.ts` (روز ۱ هر ماه ۰۹:۰۰ تهران)

## امنیت (چک‌لیست MVP)

- وبهوک با `X-Telegram-Bot-Api-Secret-Token`
- idempotency روی `update_id`
- تأیید hash لاگین تلگرام + تازگی `auth_date`
- همه mutationها از `core` + `permissions.can`
- invite یک‌بارمصرف با انقضای ۴۸ ساعت
- کوکی نشست: httpOnly / sameSite=lax / secure در production

## دیپلوی

`docker compose up -d` روی VPS، سپس `BOT_MODE=webhook` و ست کردن webhook تلگرام به `https://<domain>/telegram/webhook` با همان secret.
