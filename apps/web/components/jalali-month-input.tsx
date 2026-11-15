"use client";

import { useMemo, useState } from "react";
import {
  currentMonthPeriod,
  JALALI_MONTHS,
  jalaliMonthLabel,
  toPeriodKey,
} from "@eth/core/calendar";

type Props = {
  name?: string;
  defaultValue?: string;
  submitLabel?: string;
};

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

  return (
    <form className="form-grid jalali-month-form" style={{ maxWidth: 360, marginBottom: 16 }}>
      <input type="hidden" name={name} value={periodKey} />
      <label>
        ماه شمسی
        <div className="jalali-date-fields">
          <select
            aria-label="ماه"
            value={jm}
            onChange={(e) => setJm(Number(e.target.value))}
          >
            {JALALI_MONTHS.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="سال"
            value={jy}
            onChange={(e) => setJy(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {jalaliMonthLabel(periodKey)} · {periodKey}
        </span>
      </label>
      <button className="btn" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
