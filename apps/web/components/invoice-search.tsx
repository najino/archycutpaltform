"use client";

import { useMemo, useState } from "react";
import {
  JALALI_MONTHS,
  jalaliMonthLabel,
  toPeriodKey,
  toPersianDigits,
} from "@eth/core/client";
import { SoftSelect } from "@/components/soft-select";

type Editor = { id: string; name: string };

type Props = {
  month: string;
  userId: string;
  status: string;
  q: string;
  editors: Editor[];
};

function parseKey(key: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  return { jy: Number(m[1]), jm: Number(m[2]) };
}

const STATUS_OPTIONS = [
  { value: "draft", label: "پیش‌نویس" },
  { value: "issued", label: "صادر شده" },
  { value: "paid", label: "پرداخت شده" },
  { value: "void", label: "باطل" },
];

export function InvoiceSearch({ month, userId, status, q, editors }: Props) {
  const initial = parseKey(month);
  const [jy, setJy] = useState(initial?.jy ?? 1405);
  const [jm, setJm] = useState(initial ? String(initial.jm) : "");
  const [editor, setEditor] = useState(userId);
  const [st, setSt] = useState(status);
  const [number, setNumber] = useState(q);

  const years = useMemo(() => {
    const base = jy;
    return Array.from({ length: 9 }, (_, i) => base - 4 + i);
  }, [jy]);

  const monthOptions = useMemo(
    () => JALALI_MONTHS.map((label, i) => ({ value: String(i + 1), label })),
    [],
  );
  const yearOptions = useMemo(
    () => years.map((y) => ({ value: String(y), label: toPersianDigits(y) })),
    [years],
  );
  const editorOptions = useMemo(
    () => editors.map((e) => ({ value: e.id, label: e.name })),
    [editors],
  );

  const periodKey = jm ? toPeriodKey(jy, Number(jm)) : "";

  function search() {
    const url = new URL(window.location.href);
    url.searchParams.delete("ok");
    url.searchParams.delete("err");
    if (periodKey) url.searchParams.set("month", periodKey);
    else url.searchParams.set("month", "all");
    if (editor) url.searchParams.set("userId", editor);
    else url.searchParams.delete("userId");
    if (st) url.searchParams.set("status", st);
    else url.searchParams.delete("status");
    const query = number.trim();
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    url.hash = "invoice-results";
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  }

  function clearAll() {
    window.location.assign("/admin/invoices?month=all#invoice-results");
  }

  return (
    <form
      className="invoice-search"
      onSubmit={(e) => {
        e.preventDefault();
        search();
      }}
    >
      <div className="invoice-search-head">
        <span className="jalali-month-label">جستجوی پیشرفته</span>
        {periodKey ? (
          <span className="muted invoice-search-current">
            {toPersianDigits(jalaliMonthLabel(periodKey))}
            {" · "}
            <span className="period-key">{toPersianDigits(periodKey)}</span>
          </span>
        ) : (
          <span className="muted invoice-search-current">همهٔ ماه‌ها</span>
        )}
      </div>

      <div className="invoice-search-grid">
        <label className="invoice-search-field">
          <span>ماه</span>
          <SoftSelect
            aria-label="ماه"
            placeholder="همه ماه‌ها"
            value={jm}
            options={monthOptions}
            onChange={setJm}
          />
        </label>
        <label className="invoice-search-field">
          <span>سال</span>
          <SoftSelect
            aria-label="سال"
            placeholder="سال"
            value={String(jy)}
            options={yearOptions}
            allowClear={false}
            onChange={(raw) => {
              const next = Number(raw);
              if (next) setJy(next);
            }}
          />
        </label>
        <label className="invoice-search-field">
          <span>ادیتور</span>
          <SoftSelect
            aria-label="ادیتور"
            placeholder="همه"
            value={editor}
            options={editorOptions}
            onChange={setEditor}
          />
        </label>
        <label className="invoice-search-field">
          <span>وضعیت</span>
          <SoftSelect
            aria-label="وضعیت"
            placeholder="همه"
            value={st}
            options={STATUS_OPTIONS}
            onChange={setSt}
          />
        </label>
        <label className="invoice-search-field">
          <span>شماره فاکتور</span>
          <input
            className="field-input"
            value={number}
            placeholder="مثلاً ۰۰۳ یا INV"
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>
        <div className="invoice-search-actions">
          <button className="btn-mini btn-mini-ok" type="submit">
            <span className="material-symbols-outlined">search</span>
            جستجو
          </button>
          <button className="btn-mini" type="button" onClick={clearAll}>
            پاک کردن
          </button>
        </div>
      </div>
    </form>
  );
}
