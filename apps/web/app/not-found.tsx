import { CatalogErrorScreen } from "@/components/catalog-error-screen";

export default function NotFoundPage() {
  return (
    <CatalogErrorScreen
      code="NOT_FOUND"
      message="این صفحه وجود ندارد یا لینک منقضی شده است."
      primaryHref="/"
      primaryLabel="بازگشت به خانه"
    />
  );
}
