"use client";

import { classifyPublicError } from "@eth/core/errors";
import { ErrorScreen } from "@/components/error-screen";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const body = classifyPublicError(error);
  return (
    <ErrorScreen
      status={body.status}
      code={body.code}
      title={body.title}
      message={body.message}
      primaryHref="/"
      onRetry={reset}
    />
  );
}
