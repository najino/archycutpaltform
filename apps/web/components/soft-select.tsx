"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SoftSelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  options: SoftSelectOption[];
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
  onChange: (value: string) => void;
};

export function SoftSelect({
  value,
  options,
  placeholder = "انتخاب",
  id,
  onChange,
  "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={`soft-select${open ? " is-open" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        id={id}
        className="soft-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={!selected ? "is-placeholder" : undefined}>{label}</span>
        <span className="material-symbols-outlined soft-select-caret">
          expand_more
        </span>
      </button>
      {open ? (
        <ul
          id={listId}
          className="soft-select-menu"
          role="listbox"
          aria-label={ariaLabel}
        >
          <li role="option" aria-selected={!value}>
            <button
              type="button"
              className={`soft-select-option${!value ? " is-active" : ""}`}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
          </li>
          {options.map((opt) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                className={`soft-select-option${
                  opt.value === value ? " is-active" : ""
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
