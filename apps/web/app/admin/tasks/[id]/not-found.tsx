import { ResourceNotFound } from "@/components/catalog-error-screen";

export default function AdminTaskNotFound() {
  return (
    <ResourceNotFound
      kind="task"
      backHref="/admin/board"
      backLabel="بازگشت به برد"
    />
  );
}
