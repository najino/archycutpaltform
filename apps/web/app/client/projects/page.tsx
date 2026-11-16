import { formatToman, listProjects, toPersianDigits } from "@eth/core";
import { requireClientPortal } from "@/lib/authz";
import { db } from "@/lib/db";

const STATUS_FA: Record<string, string> = {
  open: "باز",
  closed: "بسته",
};

export default async function ClientProjectsPage() {
  const user = await requireClientPortal();
  const projects = await listProjects(db(), user);

  return (
    <>
      <h1 className="hero-title">پروژه‌های من</h1>
      <p className="hero-sub">
        پروژه‌هایی که استودیو برای شما ثبت کرده — {toPersianDigits(projects.length)} پروژه
      </p>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>نام</th>
              <th>واحد</th>
              <th>فی واحد</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>{project.unitLabel}</td>
                <td>{formatToman(project.unitPrice)}</td>
                <td>{STATUS_FA[project.status] ?? project.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && (
          <div className="flash-alert flash-alert-info" style={{ marginTop: 12 }}>
            <span className="material-symbols-outlined flash-alert-icon">
              folder_off
            </span>
            <div className="flash-alert-body">
              <div className="flash-alert-title">هنوز پروژه‌ای ثبت نشده</div>
              <p className="flash-alert-detail">
                وقتی استودیو پروژه‌ای به نام کارفرمای شما بسازد، اینجا دیده می‌شود.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
