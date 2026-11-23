import { publicError, type PublicErrorCode } from "@eth/core/errors";
import { ErrorScreen } from "@/components/error-screen";

export function CatalogErrorScreen({
  code,
  message,
  primaryHref = "/",
  primaryLabel = "بازگشت به خانه",
  variant = "page",
  onRetry,
}: {
  code: PublicErrorCode;
  message?: string;
  primaryHref?: string;
  primaryLabel?: string;
  variant?: "page" | "panel";
  onRetry?: () => void;
}) {
  const body = publicError(code, message);
  return (
    <ErrorScreen
      status={body.status}
      code={body.code}
      title={body.title}
      message={body.message}
      primaryHref={primaryHref}
      primaryLabel={primaryLabel}
      variant={variant}
      onRetry={onRetry}
    />
  );
}

export function ResourceNotFound({
  kind,
  backHref,
  backLabel,
}: {
  kind: "invoice" | "task";
  backHref: string;
  backLabel: string;
}) {
  return (
    <CatalogErrorScreen
      code="NOT_FOUND"
      message={kind === "invoice" ? "فاکتور پیدا نشد." : "تسک پیدا نشد."}
      variant="panel"
      primaryHref={backHref}
      primaryLabel={backLabel}
    />
  );
}
