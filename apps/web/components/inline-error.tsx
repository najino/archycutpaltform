export function InlineError({
  title,
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="inline-error" role="alert">
      {title ? <strong className="inline-error-title">{title}</strong> : null}
      <p>{message}</p>
    </div>
  );
}
