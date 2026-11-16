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

  async function download() {
    setError(null);
    setBusy("download");
    try {
      const blob = await pdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "دانلود ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  async function printPdf() {
    setError(null);
    setBusy("print");
    try {
      const blob = await pdfBlob();
      const url = URL.createObjectURL(blob);
      const popup = window.open(url, "_blank", "noopener");
      if (!popup) {
        location.assign(`/api/invoices/${invoiceId}/pdf?inline=1`);
        return;
      }
      window.setTimeout(() => {
        try {
          popup.focus();
          popup.print();
        } catch {
          /* مرورگر PDF را خودش چاپ می‌کند */
        }
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "چاپ ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="invoice-pdf-actions no-print">
      <button
        type="button"
        className="btn-mini btn-mini-ok"
        onClick={download}
        disabled={!!busy}
      >
        <span className="material-symbols-outlined">download</span>
        {busy === "download" ? "در حال ساخت…" : "دانلود PDF"}
      </button>
      <button
        type="button"
        className="btn-mini"
        onClick={printPdf}
        disabled={!!busy}
      >
        <span className="material-symbols-outlined">print</span>
        {busy === "print" ? "در حال ساخت…" : "چاپ PDF"}
      </button>
      {error ? <p className="invoice-pdf-error">{error}</p> : null}
    </div>
  );
}
