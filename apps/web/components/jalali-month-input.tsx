"use client";

import { useMemo, useState } from "react";
import {
  currentMonthPeriod,
  JALALI_MONTHS,
  jalaliMonthLabel,
  toPeriodKey,
  toPersianDigits,
} from "@eth/core";
import { SoftSelect } from "@/components/soft-select";

type Props = {
  name?: string;
  defaultValue?: string;
  submitLabel?: string;
  /** Extra query fields preserved on month change (e.g. userId) */
  hiddenFields?: Record<string, string>;
};

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
  // flash/ok keys should not stick across filter changes
  url.searchParams.delete("ok");
  url.searchParams.delete("err");
  if (hiddenFields) {
    for (const [k, v] of Object.entries(hiddenFields)) {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
  }
  url.hash = "invoice-results";
  return `${url.pathname}${url.search}${url.hash}`;
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
    () => years.map((y) => ({ value: String(y), label: toPersianDigits(y) })),
    [years],
  );

  function go(nextJy: number, nextJm: number) {
    const href = buildHref(name, toPeriodKey(nextJy, nextJm), hiddenFields);
    const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (href === here) {
      document.getElementById("invoice-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    window.location.assign(href);
  }

  return (
    <form
      className="jalali-month-form"
      method="get"
      action=""
      onSubmit={(e) => {
        e.preventDefault();
        go(jy, jm);
      }}
    >
      {hiddenFields &&
        Object.entries(hiddenFields).map(([k, v]) =>
          v ? <input key={k} type="hidden" name={k} value={v} /> : null,
        )}
      <input type="hidden" name={name} value={periodKey} />

      <span className="jalali-month-label">ماه شمسی</span>
      <div className="jalali-month-controls">
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
          }}
        />
        <button className="btn-mini" type="submit">
          {submitLabel}
        </button>
      </div>
      <span className="jalali-month-hint muted">
        {toPersianDigits(jalaliMonthLabel(periodKey))}
        {" · "}
        <span className="period-key">{toPersianDigits(periodKey)}</span>
      </span>
    </form>
  );
}
