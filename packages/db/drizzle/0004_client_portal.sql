ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'client';
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "telegram_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "client_id" uuid REFERENCES "clients"("id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_lower_idx" ON "users" (lower("username")) WHERE "username" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_client_id_uidx" ON "users" ("client_id") WHERE "client_id" IS NOT NULL;
