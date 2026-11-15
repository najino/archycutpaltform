"use client";

import { useMemo, useState } from "react";
import {
  isoToJalaliParts,
  jalaliMonthLength,
  JALALI_MONTHS,
  toGregorian,
} from "@eth/core/calendar";

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
    const base =
      initial.jy > 0
        ? initial.jy
        : (() => {
            const now = isoToJalaliParts(
              new Date().toLocaleDateString("en-CA", {
                timeZone: "Asia/Tehran",
              }),
            );
            return now?.jy ?? 1404;
          })();
    return Array.from({ length: 9 }, (_, i) => base - 3 + i);
  }, [initial.jy]);

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
          style={{
            position: "absolute",
            opacity: 0,
            pointerEvents: "none",
            width: 1,
            height: 1,
          }}
        />
      ) : null}
      <div className="jalali-date-fields">
        <select
          id={id}
          aria-label="روز"
          value={empty ? "" : safeDay}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!v) {
              setJd(0);
              return;
            }
            if (jy === 0 || jm === 0) {
              const now = isoToJalaliParts(
                new Date().toLocaleDateString("en-CA", {
                  timeZone: "Asia/Tehran",
                }),
              );
              setJy(now?.jy ?? 1404);
              setJm(now?.jm ?? 1);
            }
            setJd(v);
          }}
        >
          <option value="">روز</option>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          aria-label="ماه"
          value={empty ? "" : jm}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!v) {
              setJm(0);
              setJd(0);
              return;
            }
            if (jy === 0) {
              const now = isoToJalaliParts(
                new Date().toLocaleDateString("en-CA", {
                  timeZone: "Asia/Tehran",
                }),
              );
              setJy(now?.jy ?? 1404);
            }
            setJm(v);
            if (jd > jalaliMonthLength(jy || 1404, v)) {
              setJd(jalaliMonthLength(jy || 1404, v));
            }
          }}
        >
          <option value="">ماه</option>
          {JALALI_MONTHS.map((label, i) => (
            <option key={label} value={i + 1}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="سال"
          value={empty ? "" : jy}
          onChange={(e) => {
            const v = Number(e.target.value);
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
        >
          <option value="">سال</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
