import { ResourceNotFound } from "@/components/catalog-error-screen";

export default function AdminInvoiceNotFound() {
  return (
    <ResourceNotFound
      kind="invoice"
      backHref="/admin/invoices"
      backLabel="بازگشت به فاکتورها"
    />
  );
}
