import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "editor"]);
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "delivered",
  "approved",
  "rejected",
]);
export const videoTypeEnum = pgEnum("video_type", [
  "reels",
  "shorts",
  "youtube_long",
  "other",
]);
export const activitySourceEnum = pgEnum("activity_source", [
  "web",
  "bot",
  "system",
]);
export const inviteRoleEnum = pgEnum("invite_role", ["admin", "editor"]);
export const projectStatusEnum = pgEnum("project_status", ["open", "closed"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "paid",
  "void",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  telegramId: bigint("telegram_id", { mode: "bigint" }).notNull().unique(),
  username: text("username"),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default("editor"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  categoryId: uuid("category_id").references(() => categories.id),
  videoType: videoTypeEnum("video_type"),
  unitLabel: text("unit_label").notNull().default("episode"),
  unitPrice: bigint("unit_price", { mode: "bigint" }).notNull(),
  status: projectStatusEnum("status").notNull().default("open"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    rateOverride: bigint("rate_override", { mode: "bigint" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    number: text("number").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    periodKey: text("period_key").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    totalAmount: bigint("total_amount", { mode: "bigint" }).notNull(),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    tgMessageId: integer("tg_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("invoices_user_period_idx").on(t.userId, t.periodKey)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shortCode: text("short_code").notNull().unique(),
    projectId: uuid("project_id").references(() => projects.id),
    units: numeric("units", { precision: 6, scale: 2, mode: "number" })
      .notNull()
      .default(1),
    unitPriceSnapshot: bigint("unit_price_snapshot", { mode: "bigint" }),
    amount: bigint("amount", { mode: "bigint" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    title: text("title").notNull(),
    description: text("description"),
    assigneeId: uuid("assignee_id")
      .notNull()
      .references(() => users.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    clientId: uuid("client_id").references(() => clients.id),
    categoryId: uuid("category_id").references(() => categories.id),
    videoType: videoTypeEnum("video_type"),
    status: taskStatusEnum("status").notNull().default("todo"),
    dueDate: date("due_date"),
    weekKey: text("week_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tasks_assignee_week_idx").on(t.assigneeId, t.weekKey),
    index("tasks_status_idx").on(t.status),
  ],
);

export const invoiceLines = pgTable("invoice_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id),
  projectName: text("project_name"),
  description: text("description"),
  units: numeric("units", { precision: 6, scale: 2, mode: "number" }).notNull(),
  unitPrice: bigint("unit_price", { mode: "bigint" }).notNull(),
  amount: bigint("amount", { mode: "bigint" }).notNull(),
});

export const deliverables = pgTable(
  "deliverables",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    clientId: uuid("client_id").references(() => clients.id),
    videoType: videoTypeEnum("video_type").notNull(),
    tgFileId: text("tg_file_id").notNull(),
    tgFileUniqueId: text("tg_file_unique_id").notNull(),
    channelChatId: bigint("channel_chat_id", { mode: "bigint" }).notNull(),
    channelMsgId: integer("channel_msg_id").notNull(),
    caption: text("caption"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("deliverables_task_idx").on(t.taskId),
    uniqueIndex("deliverables_file_unique_idx").on(t.tgFileUniqueId),
  ],
);

export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  source: activitySourceEnum("source").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const inviteCodes = pgTable("invite_codes", {
  code: text("code").primaryKey(),
  role: inviteRoleEnum("role").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  usedBy: uuid("used_by").references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const tgProcessedUpdates = pgTable("tg_processed_updates", {
  updateId: bigint("update_id", { mode: "bigint" }).primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const botSessions = pgTable("bot_sessions", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
});

export const taskCounters = pgTable("task_counters", {
  id: integer("id").primaryKey().default(1),
  lastValue: integer("last_value").notNull().default(0),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Deliverable = typeof deliverables.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type VideoType = (typeof videoTypeEnum.enumValues)[number];
export type ActivitySource = (typeof activitySourceEnum.enumValues)[number];
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
