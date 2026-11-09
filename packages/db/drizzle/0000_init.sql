CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'editor');
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'delivered', 'approved', 'rejected');
CREATE TYPE "public"."video_type" AS ENUM('reels', 'shorts', 'youtube_long', 'other');
CREATE TYPE "public"."activity_source" AS ENUM('web', 'bot', 'system');
CREATE TYPE "public"."invite_role" AS ENUM('admin', 'editor');

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "telegram_id" bigint NOT NULL UNIQUE,
  "username" text,
  "display_name" text NOT NULL,
  "role" "user_role" DEFAULT 'editor' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL UNIQUE,
  "slug" text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "short_code" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text,
  "assignee_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "client_id" uuid REFERENCES "clients"("id"),
  "category_id" uuid REFERENCES "categories"("id"),
  "video_type" "video_type",
  "status" "task_status" DEFAULT 'todo' NOT NULL,
  "due_date" date,
  "week_key" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tasks_assignee_week_idx" ON "tasks" ("assignee_id","week_key");
CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks" ("status");

CREATE TABLE IF NOT EXISTS "deliverables" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id"),
  "submitted_by" uuid NOT NULL REFERENCES "users"("id"),
  "title" text NOT NULL,
  "category_id" uuid NOT NULL REFERENCES "categories"("id"),
  "client_id" uuid REFERENCES "clients"("id"),
  "video_type" "video_type" NOT NULL,
  "tg_file_id" text NOT NULL,
  "tg_file_unique_id" text NOT NULL,
  "channel_chat_id" bigint NOT NULL,
  "channel_msg_id" integer NOT NULL,
  "caption" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "deliverables_task_idx" ON "deliverables" ("task_id");
CREATE UNIQUE INDEX IF NOT EXISTS "deliverables_file_unique_idx" ON "deliverables" ("tg_file_unique_id");

CREATE TABLE IF NOT EXISTS "activity_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid REFERENCES "users"("id"),
  "source" "activity_source" NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid,
  "payload" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "invite_codes" (
  "code" text PRIMARY KEY NOT NULL,
  "role" "invite_role" NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "used_by" uuid REFERENCES "users"("id"),
  "expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "tg_processed_updates" (
  "update_id" bigint PRIMARY KEY NOT NULL,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "bot_sessions" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS "task_counters" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "last_value" integer DEFAULT 0 NOT NULL
);
