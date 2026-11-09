CREATE TYPE "public"."project_status" AS ENUM('open', 'closed');
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'paid', 'void');

CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "client_id" uuid REFERENCES "clients"("id"),
  "category_id" uuid REFERENCES "categories"("id"),
  "video_type" "video_type",
  "unit_label" text DEFAULT 'episode' NOT NULL,
  "unit_price" bigint NOT NULL,
  "status" "project_status" DEFAULT 'open' NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "project_members" (
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "rate_override" bigint,
  PRIMARY KEY ("project_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "number" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "period_key" text NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "total_amount" bigint NOT NULL,
  "status" "invoice_status" DEFAULT 'draft' NOT NULL,
  "issued_at" timestamp with time zone,
  "paid_at" timestamp with time zone,
  "tg_message_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_user_period_idx" ON "invoices" ("user_id","period_key");

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "units" numeric(6,2) DEFAULT 1 NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "unit_price_snapshot" bigint;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "amount" bigint;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "invoice_id" uuid REFERENCES "invoices"("id");

CREATE TABLE IF NOT EXISTS "invoice_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id"),
  "task_id" uuid NOT NULL REFERENCES "tasks"("id"),
  "project_name" text,
  "description" text,
  "units" numeric(6,2) NOT NULL,
  "unit_price" bigint NOT NULL,
  "amount" bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL
);
