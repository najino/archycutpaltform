import { redirect } from "next/navigation";
import {
  can,
  currentMonthPeriod,
  formatToman,
  monthlyEarnings,
  toPersianDigits,
} from "@eth/core";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import Link from "next/link";

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");

  const sp = await searchParams;
  const periodKey = sp.month || currentMonthPeriod().periodKey;
  const isAdmin = can(user, "earnings.view_all");
  const rows = await monthlyEarnings(
    db(),
    user,
    periodKey,
    isAdmin ? undefined : user.id,
  );

  return (
    <>
      <h1 className="hero-title">درآمد</h1>
      <p className="hero-sub">
        فقط تسک‌های تأییدشده (approved) در ماه میلادی شمرده می‌شوند.
      </p>

      <form className="form-grid" style={{ maxWidth: 240, marginBottom: 20 }}>
        <label>
          ماه (YYYY-MM)
          <input name="month" defaultValue={periodKey} />
        </label>
        <button className="btn" type="submit">
          نمایش
        </button>
      </form>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>ادیتور</th>
              <th>تعداد تأیید</th>
              <th>واحد</th>
              <th>مبلغ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td>{r.displayName}</td>
                <td>{toPersianDigits(r.approvedCount)}</td>
                <td>{toPersianDigits(r.units)}</td>
                <td>{formatToman(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="muted">برای {periodKey} درآمدی ثبت نشده.</p>
        )}
      </div>

      {rows.map((r) => (
        <div key={`d-${r.userId}`} className="panel" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>{r.displayName}</h3>
          <ul>
            {r.tasks.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/tasks/${t.id}`}>
                  {t.shortCode} · {t.title}
                </Link>{" "}
                — {toPersianDigits(t.units)} ×{" "}
                {formatToman(t.unitPriceSnapshot)} = {formatToman(t.amount)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
