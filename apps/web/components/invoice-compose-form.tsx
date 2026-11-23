"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatToman } from "@eth/core/client";
import { parsePublicErrorPayload } from "@eth/core/errors";
import { InlineError } from "@/components/inline-error";
import { SoftSelect } from "@/components/soft-select";
import { networkPublicError } from "@/lib/api-error";

export type ComposeTask = {
  id: string;
  shortCode: string;
  title: string;
  projectName: string | null;
  units: number;
  amount: string; // toman integer as string
  alreadyInvoiced: boolean;
};

type EditorOption = { id: string; displayName: string };

type Props = {
  periodKey: string;
  periodLabel: string;
  editors: EditorOption[];
  selectedUserId: string;
  tasks: ComposeTask[];
  existingStatus?: string | null;
};


export function InvoiceComposeForm({
  periodKey,
  periodLabel,
  editors,
  selectedUserId,
  tasks,
  existingStatus,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const selectable = tasks.filter((t) => !t.alreadyInvoiced);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const t of selectable) init[t.id] = true;
    return init;
  });
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => Object.entries(checked).filter(([, v]) => v).map(([id]) => id),
    [checked],
  );

  const total = useMemo(() => {
    let sum = 0n;
    for (const t of tasks) {
      if (checked[t.id]) sum += BigInt(t.amount || "0");
    }
    return sum;
  }, [checked, tasks]);

  function onEditorChange(userId: string) {
    const q = new URLSearchParams({ month: periodKey, userId });
    router.push(`/admin/invoices/compose?${q.toString()}`);
  }

  function toggleAll(on: boolean) {
    const next: Record<string, boolean> = {};
    for (const t of selectable) next[t.id] = on;
    setChecked(next);
  }

  async function submit(issue: boolean) {
    setError(null);
    if (!selectedUserId) {
      setError("ادیتور را انتخاب کنید");
      return;
    }
    if (selectedIds.length === 0) {
      setError("حداقل یک پروژه/تسک را تیک بزنید");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/invoices/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUserId,
            periodKey,
            taskIds: selectedIds,
            issue,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          invoiceId?: string;
        };
        if (!res.ok || !data.ok) {
          throw new Error(parsePublicErrorPayload(data, res.status).message);
        }
        router.push(
          data.invoiceId
            ? `/admin/invoices/${data.invoiceId}?ok=invoice`
            : `/admin/invoices?month=${periodKey}&ok=invoice`,
        );
        router.refresh();
      } catch (err) {
        const fallback = networkPublicError();
        setError(err instanceof Error ? err.message : fallback.message);
      }
    });
  }

  const locked =
    existingStatus === "issued" || existingStatus === "paid";

  const editorOptions = useMemo(
    () => editors.map((e) => ({ value: e.id, label: e.displayName })),
    [editors],
  );

  return (
    <div className="invoice-compose">
      <div className="form-grid invoice-compose-meta">
        <label>
          ادیتور
          <SoftSelect
            aria-label="ادیتور"
            placeholder="انتخاب ادیتور…"
            value={selectedUserId}
            options={editorOptions}
            disabled={pending}
            onChange={(id) => onEditorChange(id)}
          />
        </label>
        <div className="invoice-compose-period">
          <span className="muted">دوره</span>
          <strong>{periodLabel}</strong>
          <span className="font-mono muted text-11">{periodKey}</span>
        </div>
      </div>

      {existingStatus && (
        <p className="info-banner" style={{ marginBottom: 0 }}>
          <span className="material-symbols-outlined">info</span>
          <span>
            فاکتور قبلی این ماه:{" "}
            <b>
              {existingStatus === "draft"
                ? "پیش‌نویس (قابل بازسازی)"
                : existingStatus === "void"
                  ? "باطل (قابل بازسازی)"
                  : existingStatus === "issued"
                    ? "صادر شده"
                    : "پرداخت شده"}
            </b>
            {locked
              ? " — برای تغییر ابتدا از لیست فاکتورها باطل کنید."
              : " — با ذخیره، خطوط قبلی جایگزین می‌شوند."}
          </span>
        </p>
      )}

      {!selectedUserId ? (
        <p className="muted">ابتدا ادیتور را انتخاب کنید.</p>
      ) : tasks.length === 0 ? (
        <p className="muted">
          برای این ادیتور در {periodLabel} تسک تأییدشدهٔ قابل فاکتور نیست.
        </p>
      ) : (
        <>
          <div className="invoice-compose-toolbar">
            <button
              type="button"
              className="btn-mini"
              onClick={() => toggleAll(true)}
              disabled={pending || locked || selectable.length === 0}
            >
              انتخاب همه
            </button>
            <button
              type="button"
              className="btn-mini"
              onClick={() => toggleAll(false)}
              disabled={pending || locked}
            >
              حذف انتخاب
            </button>
            <span className="muted text-11">
              {selectedIds.length} مورد · جمع {formatToman(total)}
            </span>
          </div>

          <div className="check-list invoice-compose-list">
            {tasks.map((t) => (
              <label
                key={t.id}
                className={`check-row${t.alreadyInvoiced ? " is-locked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(checked[t.id])}
                  disabled={pending || locked || t.alreadyInvoiced}
                  onChange={(e) =>
                    setChecked((prev) => ({
                      ...prev,
                      [t.id]: e.target.checked,
                    }))
                  }
                />
                <span className="invoice-compose-task">
                  <span className="invoice-compose-task-top">
                    <span className="font-mono muted">{t.shortCode}</span>
                    <strong>{t.title}</strong>
                  </span>
                  <span className="muted text-11">
                    {t.projectName ?? "بدون پروژه"} · {t.units} واحد
                    {t.alreadyInvoiced ? " · قفل‌شده در فاکتور دیگر" : ""}
                  </span>
                </span>
                <span className="invoice-compose-amount font-mono">
                  {formatToman(BigInt(t.amount || "0"))}
                </span>
              </label>
            ))}
          </div>

          <div className="invoice-compose-total panel">
            <div>
              <div className="muted">مجموع فاکتور</div>
              <div className="metric-value">{formatToman(total)}</div>
            </div>
            <div className="board-item-actions">
              <button
                type="button"
                className="btn-mini"
                disabled={pending || locked || selectedIds.length === 0}
                onClick={() => submit(false)}
              >
                ذخیره پیش‌نویس
              </button>
              <button
                type="button"
                className="btn-mini btn-mini-ok"
                disabled={pending || locked || selectedIds.length === 0}
                onClick={() => submit(true)}
              >
                <span className="material-symbols-outlined">send</span>
                {pending ? "در حال ارسال…" : "صدور به پنل ادیتور"}
              </button>
            </div>
          </div>
        </>
      )}

      {error ? <InlineError message={error} /> : null}
    </div>
  );
}
