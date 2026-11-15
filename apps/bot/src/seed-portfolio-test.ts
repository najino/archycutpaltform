/**
 * Sends a few test portfolio link posts to TELEGRAM_PORTFOLIO_CHANNEL_ID
 * and registers them as deliverables in the DB.
 */
import { createHash } from "node:crypto";
import { asc, eq, inArray, ne } from "drizzle-orm";
import {
  submitDeliverable,
} from "@eth/core";
import { getDb, tasks, categories, clients, users, deliverables } from "@eth/db";
import { formatPortfolioCaption, slugifyHashtag } from "@eth/telegram";
import { env } from "./env.js";

const SAMPLES = [
  {
    title: "[تست] ریلز املاک نور — ویو ۱",
    url: "https://drive.google.com/file/d/demo-portfolio-1/view",
    videoType: "reels" as const,
  },
  {
    title: "[تست] شورت کالکشن بهار لیما",
    url: "https://www.youtube.com/shorts/demo-portfolio-2",
    videoType: "shorts" as const,
  },
  {
    title: "[تست] پادکست آژانس نور — اپیزود دمو",
    url: "https://frame.io/share/demo-portfolio-3",
    videoType: "youtube_long" as const,
  },
];

function linkUniqueId(url: string) {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 32);
  return `link:${hash}`;
}

async function sendToChannel(caption: string) {
  const channelId = env.portfolioChannelId;
  if (!channelId) throw new Error("TELEGRAM_PORTFOLIO_CHANNEL_ID missing");

  const body = new URLSearchParams({
    chat_id: channelId.toString(),
    text: caption,
    parse_mode: "HTML",
    disable_web_page_preview: "false",
  });
  const res = await fetch(
    `https://api.telegram.org/bot${env.botToken}/sendMessage`,
    { method: "POST", body },
  );
  const data = (await res.json()) as {
    ok: boolean;
    description?: string;
    result?: { message_id: number };
  };
  if (!data.ok || !data.result) {
    throw new Error(data.description ?? "sendMessage failed");
  }
  return {
    channelChatId: channelId,
    channelMsgId: data.result.message_id,
  };
}

async function main() {
  const db = getDb(env.databaseUrl);
  console.log("channel:", env.portfolioChannelId?.toString());

  const [cats, clis, openTasks] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.name)),
    db.select().from(clients).orderBy(asc(clients.name)),
    db
      .select()
      .from(tasks)
      .where(ne(tasks.status, "approved"))
      .orderBy(asc(tasks.createdAt))
      .limit(10),
  ]);

  if (!cats[0]) throw new Error("No categories — run seed first");
  if (openTasks.length === 0) {
    throw new Error("No open tasks to attach deliverables");
  }

  const owners = await db
    .select()
    .from(users)
    .where(inArray(users.role, ["owner", "admin"]));
  const actor = owners[0];
  if (!actor) throw new Error("No owner/admin user");

  let n = 0;
  for (let i = 0; i < SAMPLES.length; i++) {
    const sample = SAMPLES[i]!;
    const task = openTasks[i % openTasks.length]!;
    const category =
      cats.find((c) => c.id === task.categoryId) ?? cats[0]!;
    const client = task.clientId
      ? clis.find((c) => c.id === task.clientId) ?? null
      : clis[0] ?? null;

    const assignee =
      (
        await db
          .select()
          .from(users)
          .where(eq(users.id, task.assigneeId))
          .limit(1)
      )[0] ?? actor;

    // Owner/admin can submit for any task
    const submitter = actor.role === "editor" ? assignee : actor;

    const caption = formatPortfolioCaption({
      title: sample.title,
      categoryName: category.name,
      categorySlug: category.slug,
      clientName: client?.name ?? null,
      clientSlug: client ? slugifyHashtag(client.name) : null,
      videoType: sample.videoType,
      editorName: assignee.displayName,
      mediaUrl: sample.url,
    });

    const published = await sendToChannel(caption);
    const deliverable = await submitDeliverable(
      db,
      submitter,
      {
        taskId: task.id,
        title: sample.title,
        categoryId: category.id,
        clientId: client?.id ?? null,
        videoType: sample.videoType,
        tgFileId: sample.url,
        tgFileUniqueId: linkUniqueId(`${sample.url}#${Date.now()}#${i}`),
        channelChatId: published.channelChatId,
        channelMsgId: published.channelMsgId,
        caption,
      },
      "system",
    );

    n += 1;
    console.log(
      `OK ${n}. ${sample.title} → ${task.shortCode} · channel msg ${deliverable.channelMsgId}`,
    );
  }

  const total = await db.select().from(deliverables);
  console.log(`Done. deliverables in DB: ${total.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
