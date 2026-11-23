"use client";

import { useState } from "react";

export function InvoicePdfActions({
  invoiceId,
  number,
}: {
  invoiceId: string;
  number: string;
}) {
  const [busy, setBusy] = useState<"download" | "print" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pdfBlob() {
    const res = await fetch(`/api/invoices/${invoiceId}/pdf`);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "ساخت PDF ناموفق بود");
    }
    return res.blob();
  }

  async function run(
    kind: "download" | "print",
    action: () => Promise<void>,
    fallback: string,
  ) {
    setError(null);
    setBusy(kind);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(null);
    }
  }

  function download() {
    void run(
      "download",
      async () => {
        const blob = await pdfBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${number}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      },
      "دانلود ناموفق بود",
    );
  }

  function printPdf() {
    void run(
      "print",
      async () => {
        const blob = await pdfBlob();
        const url = URL.createObjectURL(blob);
        const popup = window.open(url, "_blank");
        if (!popup) {
          location.assign(`/api/invoices/${invoiceId}/pdf?inline=1`);
          window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
          return;
        }
        popup.opener = null;
        window.setTimeout(() => {
          try {
            popup.focus();
            popup.print();
          } catch {
            /* نمایشگر PDF مرورگر چاپ را خودش فراهم می‌کند */
          }
          window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }, 800);
      },
      "چاپ ناموفق بود",
    );
  }

  return (
    <div
      className="invoice-pdf-actions no-print"
      role="group"
      aria-label="دانلود و چاپ فاکتور"
    >
      <button
        type="button"
        className="btn-mini btn-mini-ok"
        onClick={download}
        disabled={!!busy}
        aria-busy={busy === "download"}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          download
        </span>
        {busy === "download" ? "در حال ساخت…" : "دانلود PDF"}
      </button>
      <button
        type="button"
        className="btn-mini"
        onClick={printPdf}
        disabled={!!busy}
        aria-busy={busy === "print"}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          print
        </span>
        {busy === "print" ? "در حال ساخت…" : "چاپ PDF"}
      </button>
      {error ? (
        <p className="invoice-pdf-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
