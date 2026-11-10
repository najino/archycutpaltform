import { redirect } from "next/navigation";
import type { User } from "@eth/db";
import { can } from "@eth/core";
import { getSessionUser } from "./session";

export function isAdminUser(user: User): boolean {
  return can(user, "task.view_all");
}

export function homeForUser(user: User): string {
  return isAdminUser(user) ? "/admin" : "/week";
}

export async function requireAdmin(): Promise<User> {
  const user = await getSessionUser();
  if (!user || !user.isActive) redirect("/login?portal=admin");
  if (!isAdminUser(user)) redirect("/week");
  return user;
}

export async function requireEditorPortal(): Promise<User> {
  const user = await getSessionUser();
  if (!user || !user.isActive) redirect("/login?portal=editor");
  // Admins should stay in admin panel, not editor workspace
  if (isAdminUser(user)) redirect("/admin");
  return user;
}
