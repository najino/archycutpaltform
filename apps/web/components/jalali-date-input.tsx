"use client";

import { useMemo, useState } from "react";
import {
  isoToJalaliParts,
  jalaliMonthLength,
  JALALI_MONTHS,
  toGregorian,
  toPersianDigits,
} from "@eth/core";
import { SoftSelect } from "@/components/soft-select";

type Props = {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  id?: string;
};

function isoFromParts(jy: number, jm: number, jd: number) {
  const g = toGregorian(jy, jm, jd);
  return `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
}

function nowJalali() {
  return (
    isoToJalaliParts(
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }),
    ) ?? { jy: 1404, jm: 1, jd: 1 }
  );
}

export function JalaliDateInput({
  name,
  defaultValue,
  required,
  id,
}: Props) {
  const initial = useMemo(() => {
    if (defaultValue) {
      const parts = isoToJalaliParts(defaultValue);
      if (parts) return parts;
    }
    return { jy: 0, jm: 0, jd: 0 };
  }, [defaultValue]);

  const [jy, setJy] = useState(initial.jy);
  const [jm, setJm] = useState(initial.jm);
  const [jd, setJd] = useState(initial.jd);

  const empty = jy === 0 || jm === 0 || jd === 0;
  const maxDay = jm > 0 && jy > 0 ? jalaliMonthLength(jy, jm) : 31;
  const safeDay = empty ? 0 : Math.min(jd, maxDay);
  const iso = empty ? "" : isoFromParts(jy, jm, safeDay);

  const years = useMemo(() => {
    const base = initial.jy > 0 ? initial.jy : nowJalali().jy;
    return Array.from({ length: 9 }, (_, i) => base - 3 + i);
  }, [initial.jy]);

  const dayOptions = useMemo(
    () =>
      Array.from({ length: maxDay }, (_, i) => {
        const d = i + 1;
        return { value: String(d), label: toPersianDigits(d) };
      }),
    [maxDay],
  );

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

  return (
    <div className="jalali-date-input" dir="rtl">
      <input type="hidden" name={name} value={iso} />
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={iso}
          onChange={() => undefined}
          className="jalali-required-proxy"
        />
      ) : null}
      <div className="jalali-date-fields">
        <SoftSelect
          id={id}
          aria-label="روز"
          placeholder="روز"
          value={empty ? "" : String(safeDay)}
          options={dayOptions}
          onChange={(raw) => {
            const v = Number(raw);
            if (!v) {
              setJd(0);
              return;
            }
            if (jy === 0 || jm === 0) {
              const now = nowJalali();
              setJy(now.jy);
              setJm(now.jm);
            }
            setJd(v);
          }}
        />
        <SoftSelect
          aria-label="ماه"
          placeholder="ماه"
          value={empty ? "" : String(jm)}
          options={monthOptions}
          onChange={(raw) => {
            const v = Number(raw);
            if (!v) {
              setJm(0);
              setJd(0);
              return;
            }
            if (jy === 0) setJy(nowJalali().jy);
            setJm(v);
            const len = jalaliMonthLength(jy || nowJalali().jy, v);
            if (jd > len) setJd(len);
          }}
        />
        <SoftSelect
          aria-label="سال"
          placeholder="سال"
          value={empty ? "" : String(jy)}
          options={yearOptions}
          onChange={(raw) => {
            const v = Number(raw);
            if (!v) {
              setJy(0);
              setJm(0);
              setJd(0);
              return;
            }
            setJy(v);
            if (jm === 0) setJm(1);
            if (jd === 0) setJd(1);
            else if (jm > 0 && jd > jalaliMonthLength(v, jm)) {
              setJd(jalaliMonthLength(v, jm));
            }
          }}
        />
      </div>
    </div>
  );
}
