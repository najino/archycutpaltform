import {
  parsePublicErrorPayload,
  publicError,
  type PublicError,
} from "@eth/core/errors";

export async function readResponseError(res: Response): Promise<PublicError> {
  const data = await res.json().catch(() => ({}));
  return parsePublicErrorPayload(data, res.status);
}

export function networkPublicError(): PublicError {
  return publicError(
    "UNAVAILABLE",
    "خطای شبکه. اتصال اینترنت را بررسی کنید.",
  );
}
