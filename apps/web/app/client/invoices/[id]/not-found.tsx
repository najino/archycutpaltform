import { ResourceNotFound } from "@/components/catalog-error-screen";

export default function ClientInvoiceNotFound() {
  return (
    <ResourceNotFound
      kind="invoice"
      backHref="/client/invoices"
      backLabel="بازگشت به فاکتورها"
    />
  );
}
