export function BrandLoader({
  label = "در حال آماده‌سازی…",
  fullScreen = true,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={fullScreen ? "brand-loader brand-loader-full" : "brand-loader"}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="brand-loader-orb brand-loader-orb-a" aria-hidden />
      <div className="brand-loader-orb brand-loader-orb-b" aria-hidden />

      <div className="brand-loader-card">
        <div className="brand-loader-mark" aria-hidden>
          <span className="material-symbols-outlined">movie_filter</span>
          <span className="brand-loader-ring" />
        </div>

        <div className="brand-loader-name" dir="ltr">
          ARSHYCUTPLATFORM
        </div>
        <div className="brand-loader-sub">Edit Team Hub</div>

        <div className="brand-loader-bar" aria-hidden>
          <span className="brand-loader-bar-fill" />
        </div>

        <p className="brand-loader-label">{label}</p>
      </div>
    </div>
  );
}
