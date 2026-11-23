import { CatalogErrorScreen } from "@/components/catalog-error-screen";

export default function TaskNotFound() {
  return (
    <CatalogErrorScreen
      code="NOT_FOUND"
      message="تسک پیدا نشد."
      primaryHref="/week"
      primaryLabel="بازگشت به هفته"
    />
  );
}
