import {
  isUuid,
  listCategories,
  listClients,
  listDeliverables,
  listMembers,
} from "@eth/core";
import { channelPostUrl, videoTypeLabel } from "@eth/telegram";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoryId?: string;
    clientId?: string;
    videoType?: string;
    editorId?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const videoType =
    sp.videoType === "reels" ||
    sp.videoType === "shorts" ||
    sp.videoType === "youtube_long" ||
    sp.videoType === "other"
      ? sp.videoType
      : undefined;

  const [rows, cats, clients, members] = await Promise.all([
    listDeliverables(db(), {
      categoryId: sp.categoryId && isUuid(sp.categoryId) ? sp.categoryId : undefined,
      clientId: sp.clientId && isUuid(sp.clientId) ? sp.clientId : undefined,
      videoType,
      editorId: sp.editorId && isUuid(sp.editorId) ? sp.editorId : undefined,
    }),
    listCategories(db()),
    listClients(db()),
    listMembers(db()),
  ]);

  return (
    <>
      <h1 className="hero-title">پورتفولیو</h1>
      <p className="hero-sub">
        همه تحویل‌ها با لینک مستقیم به پست کانال تلگرام.
      </p>

      <form className="form-grid" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
            gap: 10,
          }}
        >
          <label>
            دسته
            <select name="categoryId" defaultValue={sp.categoryId ?? ""}>
              <option value="">همه</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            کارفرما
            <select name="clientId" defaultValue={sp.clientId ?? ""}>
              <option value="">همه</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            نوع
            <select name="videoType" defaultValue={sp.videoType ?? ""}>
              <option value="">همه</option>
              <option value="reels">Reels</option>
              <option value="shorts">Shorts</option>
              <option value="youtube_long">YouTube long</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            ادیتور
            <select name="editorId" defaultValue={sp.editorId ?? ""}>
              <option value="">همه</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn-mini" type="submit">
          فیلتر
        </button>
      </form>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>عنوان</th>
              <th>دسته</th>
              <th>کارفرما</th>
              <th>نوع</th>
              <th>ادیتور</th>
              <th>لینک</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.deliverable.id}>
                <td>{r.deliverable.title}</td>
                <td>{r.category?.name ?? "—"}</td>
                <td>{r.client?.name ?? "—"}</td>
                <td>{videoTypeLabel(r.deliverable.videoType)}</td>
                <td>{r.editor?.displayName ?? "—"}</td>
                <td>
                  <a
                    href={channelPostUrl(
                      r.deliverable.channelChatId,
                      r.deliverable.channelMsgId,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    مشاهده
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted">موردی نیست.</p>}
      </div>
    </>
  );
}
