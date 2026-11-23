export const INVOICE_STATUS_LABELS = {
  draft: "پیش‌نویس",
  issued: "صادر شده",
  paid: "پرداخت شده",
  void: "باطل",
} as const;

export type InvoiceStatusKey = keyof typeof INVOICE_STATUS_LABELS;

export const INVOICE_STATUS_OPTIONS = (
  Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatusKey[]
).map((value) => ({ value, label: INVOICE_STATUS_LABELS[value] }));

export function invoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABELS[status as InvoiceStatusKey] ?? status;
}

export const PROJECT_STATUS_LABELS = {
  open: "باز",
  closed: "بسته",
} as const;

export type ProjectStatusKey = keyof typeof PROJECT_STATUS_LABELS;

export function projectStatusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[status as ProjectStatusKey] ?? status;
}
