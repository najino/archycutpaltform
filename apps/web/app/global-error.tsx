"use client";

import { classifyPublicError } from "@eth/core/errors";
import { ErrorScreen } from "@/components/error-screen";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const body = classifyPublicError(error);
  return (
    <html lang="fa" dir="rtl">
      <body style={{ backgroundColor: "#100e18", color: "#ece8f5" }}>
        <ErrorScreen
          status={body.status}
          code={body.code}
          title={body.title}
          message={body.message}
          primaryHref="/"
          onRetry={reset}
        />
      </body>
    </html>
  );
}
