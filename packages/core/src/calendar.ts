/**
 * Jalali (Shamsi) calendar month helpers in Asia/Tehran.
 * periodKey is Jalali YYYY-MM; periodStart/End are Gregorian ISO dates for DB filters.
 */

const TZ = "Asia/Tehran";

const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

function div(a: number, b: number) {
  return Math.floor(a / b);
}

function mod(a: number, b: number) {
  return a - Math.floor(a / b) * b;
}

/** Convert Gregorian to Jalali. Months/days are 1-based. */
export function toJalali(
  gy: number,
  gm: number,
  gd: number,
): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let gy2 = gy <= 1600 ? gy - 621 : gy - 1600;
  const days =
    365 * gy2 +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) -
    80 +
    gd +
    g_d_m[gm - 1]! -
    (gm > 2 ? (isGregorianLeap(gy) ? 1 : 0) : 0);
  jy += 33 * div(days, 12053);
  let remaining = days % 12053;
  jy += 4 * div(remaining, 1461);
  remaining %= 1461;
  if (remaining > 365) {
    jy += div(remaining - 1, 365);
    remaining = (remaining - 1) % 365;
  }
  const jm = remaining < 186 ? 1 + div(remaining, 31) : 7 + div(remaining - 186, 30);
  const jd = 1 + (remaining < 186 ? remaining % 31 : (remaining - 186) % 30);
  return { jy, jm, jd };
}

/** Convert Jalali to Gregorian. Months/days are 1-based. */
export function toGregorian(
  jy: number,
  jm: number,
  jd: number,
): { gy: number; gm: number; gd: number } {
  let gy = jy <= 979 ? 621 : 1600;
  let jy2 = jy <= 979 ? jy : jy - 979;
  const days =
    365 * jy2 +
    div(jy2, 33) * 8 +
    div(mod(jy2, 33) + 3, 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * div(days, 146097);
  let remaining = days % 146097;
  if (remaining > 36524) {
    gy += 100 * div(--remaining, 36524);
    remaining %= 36524;
    if (remaining >= 365) remaining++;
  }
  gy += 4 * div(remaining, 1461);
  remaining %= 1461;
  if (remaining > 365) {
    gy += div(remaining - 1, 365);
    remaining = (remaining - 1) % 365;
  }
  let gd = remaining + 1;
  const sal_a = [
    0,
    31,
    isGregorianLeap(gy) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  while (gm < 13 && gd > sal_a[gm]!) {
    gd -= sal_a[gm]!;
    gm++;
  }
  return { gy, gm, gd };
}

function isGregorianLeap(gy: number) {
  return (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
}

export function isJalaliLeap(jy: number) {
  return mod(mod(jy - (jy > 0 ? 474 : 473), 2820) + 474 + 38, 2816) < 682;
}

export function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

function partsInTehran(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "01";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
  };
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export type MonthPeriod = {
  /** Jalali YYYY-MM */
  periodKey: string;
  /** Gregorian YYYY-MM-DD (first day of Jalali month, Asia/Tehran) */
  periodStart: string;
  /** Gregorian YYYY-MM-DD (last day of Jalali month, Asia/Tehran) */
  periodEnd: string;
};

export function toPeriodKey(jy: number, jm: number): string {
  return `${jy}-${String(jm).padStart(2, "0")}`;
}

export function monthPeriod(jy: number, jm: number): MonthPeriod {
  if (jm < 1 || jm > 12) throw new Error(`Invalid Jalali month: ${jm}`);
  const periodKey = toPeriodKey(jy, jm);
  const startG = toGregorian(jy, jm, 1);
  const endG = toGregorian(jy, jm, jalaliMonthLength(jy, jm));
  return {
    periodKey,
    periodStart: isoDate(startG.gy, startG.gm, startG.gd),
    periodEnd: isoDate(endG.gy, endG.gm, endG.gd),
  };
}

export function parsePeriodKey(periodKey: string): MonthPeriod {
  const m = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (!m) throw new Error(`Invalid period_key: ${periodKey}`);
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  if (jy < 1300 || jy > 1600 || jm < 1 || jm > 12) {
    throw new Error(`Invalid Jalali period_key: ${periodKey}`);
  }
  return monthPeriod(jy, jm);
}

/**
 * اگر کلید میلادی قدیمی باشد (مثل 2026-11) به شمسی برمی‌گرداند.
 * کلیدهای ۱۳۰۰–۱۶۰۰ همان شمسی فرض می‌شوند.
 */
export function coerceToJalaliPeriodKey(periodKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (!m) return periodKey;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return periodKey;
  if (y >= 1300 && y <= 1600) return periodKey;
  const j = toJalali(y, mo, 15);
  return toPeriodKey(j.jy, j.jm);
}

/**
 * کلیدهای معادل برای فیلتر: شمسی + ماه‌های میلادی هم‌پوشان
 * (برای دادهٔ قدیمی که اشتباهاً با YYYY-MM میلادی ذخیره شده)
 */
export function periodKeyAliases(periodKey: string): string[] {
  const jalali = coerceToJalaliPeriodKey(periodKey);
  const period = parsePeriodKey(jalali);
  const keys = new Set<string>([period.periodKey]);
  keys.add(period.periodStart.slice(0, 7));
  keys.add(period.periodEnd.slice(0, 7));
  return [...keys];
}

export function currentMonthPeriod(now = new Date()): MonthPeriod {
  const g = partsInTehran(now);
  const j = toJalali(g.year, g.month, g.day);
  return monthPeriod(j.jy, j.jm);
}

/** Previous Jalali month relative to "now" in Asia/Tehran */
export function previousMonthPeriod(now = new Date()): MonthPeriod {
  const g = partsInTehran(now);
  const j = toJalali(g.year, g.month, g.day);
  if (j.jm === 1) return monthPeriod(j.jy - 1, 12);
  return monthPeriod(j.jy, j.jm - 1);
}

export function periodContainsDate(period: MonthPeriod, date: Date): boolean {
  const g = partsInTehran(date);
  const iso = isoDate(g.year, g.month, g.day);
  return iso >= period.periodStart && iso <= period.periodEnd;
}

export function jalaliMonthName(jm: number): string {
  return JALALI_MONTHS[jm - 1] ?? String(jm);
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function toFaDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]!);
}

/** e.g. «آبان ۱۴۰۴» — کلید میلادی قدیمی را هم درست نشان می‌دهد */
export function jalaliMonthLabel(periodKey: string): string {
  const key = coerceToJalaliPeriodKey(periodKey);
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return periodKey;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  return `${jalaliMonthName(jm)} ${toFaDigits(jy)}`;
}

/** @deprecated use jalaliMonthLabel — kept for call-site compatibility */
export function englishMonthLabel(periodKey: string): string {
  return jalaliMonthLabel(periodKey);
}

/** Format Gregorian YYYY-MM-DD (or Date) as Jalali YYYY/MM/DD */
export function formatJalaliDate(
  input: string | Date | null | undefined,
  opts?: { persianDigits?: boolean },
): string {
  if (input == null || input === "") return "—";
  let gy: number;
  let gm: number;
  let gd: number;
  if (typeof input === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
    if (!m) return input;
    gy = Number(m[1]);
    gm = Number(m[2]);
    gd = Number(m[3]);
  } else {
    const g = partsInTehran(input);
    gy = g.year;
    gm = g.month;
    gd = g.day;
  }
  const j = toJalali(gy, gm, gd);
  const raw = `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`;
  if (opts?.persianDigits === false) return raw;
  return raw.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

/** Format DateTime in Asia/Tehran as Jalali date + time */
export function formatJalaliDateTime(
  date: Date | null | undefined,
  opts?: { persianDigits?: boolean },
): string {
  if (!date) return "—";
  const datePart = formatJalaliDate(date, opts);
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const time = timeFmt.format(date);
  const out = `${datePart} ${time}`;
  if (opts?.persianDigits === false) return out;
  return out.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

/** Parse Jalali YYYY/MM/DD or YYYY-MM-DD into Gregorian YYYY-MM-DD */
export function jalaliToIsoDate(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\/.]/g, "-");
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(cleaned);
  if (!m) return null;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  const jd = Number(m[3]);
  if (jm < 1 || jm > 12 || jd < 1 || jd > jalaliMonthLength(jy, jm)) return null;
  const g = toGregorian(jy, jm, jd);
  return isoDate(g.gy, g.gm, g.gd);
}

/**
 * Accept Gregorian ISO (20xx-…) or Jalali (13xx/14xx…) and return Gregorian YYYY-MM-DD.
 */
export function parseFlexibleDate(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const iso = cleaned.replace(/[\/.]/g, "-");
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  if (y >= 1900 && y <= 2100) {
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return isoDate(y, mm, dd);
  }
  if (y >= 1300 && y <= 1600) return jalaliToIsoDate(cleaned);
  return null;
}

/** Gregorian YYYY-MM-DD → Jalali parts */
export function isoToJalaliParts(iso: string): {
  jy: number;
  jm: number;
  jd: number;
} | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return toJalali(Number(m[1]), Number(m[2]), Number(m[3]));
}

export { TZ as TEHRAN_TZ, JALALI_MONTHS };
