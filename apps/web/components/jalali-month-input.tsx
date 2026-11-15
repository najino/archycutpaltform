"use client";

import { useMemo, useState } from "react";
import {
  currentMonthPeriod,
  JALALI_MONTHS,
  jalaliMonthLabel,
  toPeriodKey,
} from "@eth/core/calendar";
import { SoftSelect } from "@/components/soft-select";

type Props = {
  name?: string;
  defaultValue?: string;
  submitLabel?: string;
};

const FA = "۰۱۲۳۴۵۶۷۸۹";
function faDigits(n: number | string) {
  return String(n).replace(/\d/g, (d) => FA[Number(d)]!);
}

export function JalaliMonthInput({
  name = "month",
  defaultValue,
  submitLabel = "نمایش",
}: Props) {
  const fallback = currentMonthPeriod().periodKey;
  const initial = defaultValue || fallback;
  const parsed = /^(\d{4})-(\d{2})$/.exec(initial);
  const [jy, setJy] = useState(parsed ? Number(parsed[1]) : 1404);
  const [jm, setJm] = useState(parsed ? Number(parsed[2]) : 1);

  const periodKey = toPeriodKey(jy, jm);
  const years = useMemo(() => {
    const base = jy;
    return Array.from({ length: 7 }, (_, i) => base - 3 + i);
  }, [jy]);

  const monthOptions = useMemo(
    () =>
      JALALI_MONTHS.map((label, i) => ({
        value: String(i + 1),
        label,
      })),
    [],
  );

  const yearOptions = useMemo(
    () => years.map((y) => ({ value: String(y), label: faDigits(y) })),
    [years],
  );

  return (
    <form className="form-grid jalali-month-form">
      <input type="hidden" name={name} value={periodKey} />
      <label>
        ماه شمسی
        <div className="jalali-date-fields">
          <SoftSelect
            aria-label="ماه"
            placeholder="ماه"
            value={String(jm)}
            options={monthOptions}
            onChange={(raw) => setJm(Number(raw) || 1)}
          />
          <SoftSelect
            aria-label="سال"
            placeholder="سال"
            value={String(jy)}
            options={yearOptions}
            onChange={(raw) => setJy(Number(raw) || jy)}
          />
        </div>
        <span className="jalali-month-hint muted">
          {jalaliMonthLabel(periodKey)} · {faDigits(periodKey)}
        </span>
      </label>
      <button className="btn" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
