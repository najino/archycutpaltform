/**
 * Gregorian calendar month helpers in Asia/Tehran.
 */

const TZ = "Asia/Tehran";

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

export type MonthPeriod = {
  periodKey: string; // YYYY-MM
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
};

export function toPeriodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthPeriod(year: number, month: number): MonthPeriod {
  const periodKey = toPeriodKey(year, month);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    periodKey,
    periodStart: `${periodKey}-01`,
    periodEnd: `${periodKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function parsePeriodKey(periodKey: string): MonthPeriod {
  const m = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (!m) throw new Error(`Invalid period_key: ${periodKey}`);
  return monthPeriod(Number(m[1]), Number(m[2]));
}

export function currentMonthPeriod(now = new Date()): MonthPeriod {
  const { year, month } = partsInTehran(now);
  return monthPeriod(year, month);
}

/** Previous Gregorian month relative to "now" in Asia/Tehran */
export function previousMonthPeriod(now = new Date()): MonthPeriod {
  const { year, month } = partsInTehran(now);
  if (month === 1) return monthPeriod(year - 1, 12);
  return monthPeriod(year, month - 1);
}

export function periodContainsDate(period: MonthPeriod, date: Date): boolean {
  const { year, month, day } = partsInTehran(date);
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return iso >= period.periodStart && iso <= period.periodEnd;
}

export function englishMonthLabel(periodKey: string): string {
  const { periodStart } = parsePeriodKey(periodKey);
  const d = new Date(`${periodStart}T12:00:00Z`);
  return d.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export { TZ as TEHRAN_TZ };
