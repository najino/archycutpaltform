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
  /** Extra query fields preserved on month change (e.g. userId) */
  hiddenFields?: Record<string, string>;
};

const FA = "۰۱۲۳۴۵۶۷۸۹";
function faDigits(n: number | string) {
  return String(n).replace(/\d/g, (d) => FA[Number(d)]!);
}

function parseKey(key: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  return { jy: Number(m[1]), jm: Number(m[2]) };
}

function buildHref(
  name: string,
  periodKey: string,
  hiddenFields?: Record<string, string>,
) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, periodKey);
  if (hiddenFields) {
    for (const [k, v] of Object.entries(hiddenFields)) {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
  }
  return `${url.pathname}${url.search}`;
}

export function JalaliMonthInput({
  name = "month",
  defaultValue,
  submitLabel = "نمایش",
  hiddenFields,
}: Props) {
  const fallback = currentMonthPeriod().periodKey;
  const initial = parseKey(defaultValue || fallback);
  const [jy, setJy] = useState(initial?.jy ?? 1404);
  const [jm, setJm] = useState(initial?.jm ?? 1);

  const periodKey = toPeriodKey(jy, jm);

  const years = useMemo(() => {
    const base = jy;
    return Array.from({ length: 9 }, (_, i) => base - 4 + i);
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

  function go(nextJy: number, nextJm: number) {
    const key = toPeriodKey(nextJy, nextJm);
    const href = buildHref(name, key, hiddenFields);
    // ناوبری کامل تا searchParams سرور حتماً تازه شود
    window.location.assign(href);
  }

  return (
    <div className="form-grid jalali-month-form">
      <div className="jalali-month-field">
        <span className="jalali-month-label">ماه شمسی</span>
        <div className="jalali-date-fields">
          <SoftSelect
            aria-label="ماه"
            placeholder="ماه"
            value={String(jm)}
            options={monthOptions}
            allowClear={false}
            onChange={(raw) => {
              const next = Number(raw);
              if (!next || next < 1 || next > 12) return;
              setJm(next);
              go(jy, next);
            }}
          />
          <SoftSelect
            aria-label="سال"
            placeholder="سال"
            value={String(jy)}
            options={yearOptions}
            allowClear={false}
            onChange={(raw) => {
              const next = Number(raw);
              if (!next) return;
              setJy(next);
              go(next, jm);
            }}
          />
        </div>
        <span className="jalali-month-hint muted">
          {jalaliMonthLabel(periodKey).replace(/\d/g, (d) => FA[Number(d)]!)} ·{" "}
          {faDigits(periodKey)}
        </span>
      </div>
      <button
        className="btn-mini"
        type="button"
        onClick={() => go(jy, jm)}
      >
        {submitLabel}
      </button>
    </div>
  );
}
