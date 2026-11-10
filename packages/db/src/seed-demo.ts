import "./load-env.js";
import { and, eq, sql } from "drizzle-orm";
import { randomBytes, scryptSync } from "node:crypto";
import { getDb } from "./client.js";
import {
  categories,
  clients,
  projectMembers,
  projects,
  taskCounters,
  tasks,
  users,
} from "./schema.js";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function toWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

async function upsertUser(
  db: ReturnType<typeof getDb>,
  input: {
    telegramId: bigint;
    displayName: string;
    username: string;
    role: "owner" | "admin" | "editor";
    password: string;
  },
) {
  const existing = (
    await db
      .select()
      .from(users)
      .where(eq(users.telegramId, input.telegramId))
      .limit(1)
  )[0];

  const passwordHash = hashPassword(input.password);
  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        displayName: input.displayName,
        username: input.username,
        role: input.role,
        passwordHash,
        isActive: true,
      })
      .where(eq(users.id, existing.id))
      .returning();
    return updated!;
  }

  const [created] = await db
    .insert(users)
    .values({
      telegramId: input.telegramId,
      displayName: input.displayName,
      username: input.username,
      role: input.role,
      passwordHash,
      isActive: true,
    })
    .returning();
  return created!;
}

async function nextShortCode(db: ReturnType<typeof getDb>) {
  const rows = await db
    .update(taskCounters)
    .set({ lastValue: sql`${taskCounters.lastValue} + 1` })
    .where(eq(taskCounters.id, 1))
    .returning({ lastValue: taskCounters.lastValue });
  let value = rows[0]?.lastValue;
  if (value == null) {
    await db.insert(taskCounters).values({ id: 1, lastValue: 1 });
    value = 1;
  }
  return `T-${String(value).padStart(4, "0")}`;
}

async function main() {
  const db = getDb();
  const weekKey = toWeekKey();
  const password = "test1234";

  await db
    .insert(taskCounters)
    .values({ id: 1, lastValue: 0 })
    .onConflictDoNothing();

  // Ensure base categories/clients
  const cats = [
    { name: "املاک", slug: "real_estate" },
    { name: "فشن", slug: "fashion" },
    { name: "غذا", slug: "food" },
    { name: "گیمینگ", slug: "gaming" },
    { name: "سایر", slug: "other" },
  ];
  for (const cat of cats) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }

  for (const name of ["داخلی", "آژانس نور", "کافه رستا", "برند لیما"]) {
    await db.insert(clients).values({ name }).onConflictDoNothing();
  }

  const ownerTelegramId = process.env.OWNER_TELEGRAM_ID?.trim();
  const ownerPassword = process.env.OWNER_PASSWORD?.trim() || "admin123";
  if (ownerTelegramId) {
    await upsertUser(db, {
      telegramId: BigInt(ownerTelegramId),
      displayName: "Owner",
      username: "owner",
      role: "owner",
      password: ownerPassword,
    });
  }

  const admin = await upsertUser(db, {
    telegramId: 9000000001n,
    displayName: "سارا ادمین",
    username: "sara_admin",
    role: "admin",
    password,
  });

  const editor1 = await upsertUser(db, {
    telegramId: 9000000002n,
    displayName: "علی ادیتور",
    username: "ali_editor",
    role: "editor",
    password,
  });

  const editor2 = await upsertUser(db, {
    telegramId: 9000000003n,
    displayName: "مینا ادیتور",
    username: "mina_editor",
    role: "editor",
    password,
  });

  const editor3 = await upsertUser(db, {
    telegramId: 9000000004n,
    displayName: "رضا ادیتور",
    username: "reza_editor",
    role: "editor",
    password,
  });

  const allCats = await db.select().from(categories);
  const allClients = await db.select().from(clients);
  const cat = (slug: string) => allCats.find((c) => c.slug === slug)!;
  const client = (name: string) => allClients.find((c) => c.name === name)!;

  const owner =
    (
      await db
        .select()
        .from(users)
        .where(eq(users.role, "owner"))
        .limit(1)
    )[0] ?? admin;

  // Clear previous demo projects/tasks marked by name prefix to keep re-runnable-ish
  // (we only add if project not exists)
  async function ensureProject(input: {
    name: string;
    clientName: string;
    categorySlug: string;
    videoType: "reels" | "shorts" | "youtube_long" | "other";
    unitLabel: string;
    unitPrice: bigint;
    memberIds: string[];
    overrides?: Record<string, bigint>;
  }) {
    const existing = (
      await db.select().from(projects).where(eq(projects.name, input.name)).limit(1)
    )[0];
    if (existing) return existing;

    const [project] = await db
      .insert(projects)
      .values({
        name: input.name,
        clientId: client(input.clientName).id,
        categoryId: cat(input.categorySlug).id,
        videoType: input.videoType,
        unitLabel: input.unitLabel,
        unitPrice: input.unitPrice,
        status: "open",
        createdBy: owner.id,
      })
      .returning();

    for (const userId of input.memberIds) {
      await db.insert(projectMembers).values({
        projectId: project!.id,
        userId,
        rateOverride: input.overrides?.[userId] ?? null,
      });
    }
    return project!;
  }

  const p1 = await ensureProject({
    name: "[دمو] پادکست آژانس نور — فصل ۲",
    clientName: "آژانس نور",
    categorySlug: "other",
    videoType: "youtube_long",
    unitLabel: "episode",
    unitPrice: 1_500_000n,
    memberIds: [editor1.id, editor2.id],
    overrides: { [editor2.id]: 1_800_000n },
  });

  const p2 = await ensureProject({
    name: "[دمو] ریلز کافه رستا",
    clientName: "کافه رستا",
    categorySlug: "food",
    videoType: "reels",
    unitLabel: "video",
    unitPrice: 700_000n,
    memberIds: [editor1.id, editor3.id],
  });

  const p3 = await ensureProject({
    name: "[دمو] شورت‌های برند لیما",
    clientName: "برند لیما",
    categorySlug: "fashion",
    videoType: "shorts",
    unitLabel: "video",
    unitPrice: 900_000n,
    memberIds: [editor2.id, editor3.id],
  });

  async function ensureTask(input: {
    title: string;
    assigneeId: string;
    projectId?: string | null;
    units?: number;
    status: "todo" | "in_progress" | "delivered" | "approved" | "rejected";
    categorySlug?: string;
    clientName?: string;
    videoType?: "reels" | "shorts" | "youtube_long" | "other";
    amount?: bigint | null;
    unitPriceSnapshot?: bigint | null;
  }) {
    const existing = (
      await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.title, input.title), eq(tasks.weekKey, weekKey)))
        .limit(1)
    )[0];
    if (existing) return existing;

    const shortCode = await nextShortCode(db);
    const approved =
      input.status === "approved"
        ? {
            approvedAt: new Date(),
            amount: input.amount ?? null,
            unitPriceSnapshot: input.unitPriceSnapshot ?? null,
          }
        : {
            approvedAt: null,
            amount: null,
            unitPriceSnapshot: null,
          };

    const [task] = await db
      .insert(tasks)
      .values({
        shortCode,
        title: input.title,
        description: "تسک دمو برای تست پلتفرم",
        assigneeId: input.assigneeId,
        createdBy: owner.id,
        projectId: input.projectId ?? null,
        units: input.units ?? 1,
        clientId: input.clientName ? client(input.clientName).id : null,
        categoryId: input.categorySlug ? cat(input.categorySlug).id : null,
        videoType: input.videoType ?? null,
        status: input.status,
        dueDate: new Date().toISOString().slice(0, 10),
        weekKey,
        ...approved,
      })
      .returning();
    return task!;
  }

  // Ali
  await ensureTask({
    title: "[دمو] اپیزود ۱ پادکست نور",
    assigneeId: editor1.id,
    projectId: p1.id,
    units: 1,
    status: "approved",
    categorySlug: "other",
    clientName: "آژانس نور",
    videoType: "youtube_long",
    unitPriceSnapshot: 1_500_000n,
    amount: 1_500_000n,
  });
  await ensureTask({
    title: "[دمو] اپیزود ۲ پادکست نور",
    assigneeId: editor1.id,
    projectId: p1.id,
    units: 2,
    status: "delivered",
    categorySlug: "other",
    clientName: "آژانس نور",
    videoType: "youtube_long",
  });
  await ensureTask({
    title: "[دمو] ریلز منوی کافه",
    assigneeId: editor1.id,
    projectId: p2.id,
    units: 1,
    status: "in_progress",
    categorySlug: "food",
    clientName: "کافه رستا",
    videoType: "reels",
  });
  await ensureTask({
    title: "[دمو] تیزر داخلی بدون پروژه",
    assigneeId: editor1.id,
    status: "todo",
  });

  // Mina
  await ensureTask({
    title: "[دمو] اپیزود ۳ پادکست نور (مینا)",
    assigneeId: editor2.id,
    projectId: p1.id,
    units: 1,
    status: "approved",
    categorySlug: "other",
    clientName: "آژانس نور",
    videoType: "youtube_long",
    unitPriceSnapshot: 1_800_000n, // override rate
    amount: 1_800_000n,
  });
  await ensureTask({
    title: "[دمو] شورت کالکشن بهار لیما",
    assigneeId: editor2.id,
    projectId: p3.id,
    units: 3,
    status: "delivered",
    categorySlug: "fashion",
    clientName: "برند لیما",
    videoType: "shorts",
  });
  await ensureTask({
    title: "[دمو] شورت ریجکت‌شده لیما",
    assigneeId: editor2.id,
    projectId: p3.id,
    units: 1,
    status: "rejected",
    categorySlug: "fashion",
    clientName: "برند لیما",
    videoType: "shorts",
  });

  // Reza
  await ensureTask({
    title: "[دمو] ریلز صبحانه رستا",
    assigneeId: editor3.id,
    projectId: p2.id,
    units: 2,
    status: "approved",
    categorySlug: "food",
    clientName: "کافه رستا",
    videoType: "reels",
    unitPriceSnapshot: 700_000n,
    amount: 1_400_000n,
  });
  await ensureTask({
    title: "[دمو] شورت استوری لیما",
    assigneeId: editor3.id,
    projectId: p3.id,
    units: 1,
    status: "todo",
    categorySlug: "fashion",
    clientName: "برند لیما",
    videoType: "shorts",
  });

  console.log("\n✅ Demo data ready\n");
  console.log(`Week: ${weekKey}\n`);
  console.log("——— ورود ادمین ———");
  if (ownerTelegramId) {
    console.log(`Owner  telegram=${ownerTelegramId}  password=${ownerPassword}`);
  }
  console.log(`Admin  telegram=${admin.telegramId}  password=${password}  (${admin.displayName})`);
  console.log("\n——— ورود ادیتور ———");
  console.log(`Editor telegram=${editor1.telegramId} password=${password}  (${editor1.displayName})`);
  console.log(`Editor telegram=${editor2.telegramId} password=${password}  (${editor2.displayName})`);
  console.log(`Editor telegram=${editor3.telegramId} password=${password}  (${editor3.displayName})`);
  console.log("\nProjects:");
  console.log(`- ${p1.name}`);
  console.log(`- ${p2.name}`);
  console.log(`- ${p3.name}`);
  console.log("\nLogin: http://localhost:3000/login");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
