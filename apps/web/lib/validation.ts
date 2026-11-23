import { z } from "zod";
import { UUID_RE } from "@eth/core/security";

const uuid = z.string().regex(UUID_RE, "invalid-id");

export const loginBodySchema = z.object({
  telegramId: z.string().max(32).optional().default(""),
  username: z.string().max(64).optional().default(""),
  password: z.string().min(1).max(256),
  portal: z.enum(["admin", "editor", "client"]).optional(),
});

export const telegramAuthSchema = z.object({
  id: z.string().regex(/^\d{1,20}$/),
  first_name: z.string().max(128).optional(),
  last_name: z.string().max(128).optional(),
  username: z.string().max(64).optional(),
  photo_url: z.string().max(500).optional(),
  auth_date: z.string().regex(/^\d{1,20}$/),
  hash: z.string().regex(/^[a-f0-9]{64}$/i),
});

export const composeInvoiceSchema = z
  .object({
    userId: uuid,
    periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    taskIds: z.array(uuid).max(500).optional().default([]),
    issue: z.boolean().optional().default(false),
  })
  .strict();

export function parseJsonBody<T>(
  schema: z.ZodType<T>,
  raw: unknown,
): { ok: true; data: T } | { ok: false } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  return { ok: true, data: parsed.data };
}
