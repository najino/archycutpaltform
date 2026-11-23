import { CatalogErrorScreen } from "@/components/catalog-error-screen";

export default function InvoiceNotFound() {
  return (
    <CatalogErrorScreen
      code="NOT_FOUND"
      message="فاکتور پیدا نشد."
      primaryHref="/invoices"
      primaryLabel="بازگشت به فاکتورها"
    />
  );
}
