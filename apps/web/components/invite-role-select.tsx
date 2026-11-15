"use client";

import { useState } from "react";
import { SoftSelect } from "@/components/soft-select";

const OPTIONS = [
  { value: "editor", label: "ادیتور" },
  { value: "admin", label: "ادمین" },
];

export function InviteRoleSelect({
  name = "role",
  defaultValue = "editor",
}: {
  name?: string;
  defaultValue?: "editor" | "admin";
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <SoftSelect
        aria-label="نقش"
        placeholder="انتخاب نقش"
        value={value}
        options={OPTIONS}
        allowClear={false}
        onChange={(v) => {
          if (v === "admin" || v === "editor") setValue(v);
        }}
      />
    </>
  );
}
