import { redirect } from "next/navigation";
import type { User } from "@eth/db";
import { can, isClientUser } from "@eth/core";
import { getSessionUser } from "./session";

export function isAdminUser(user: User): boolean {
  return can(user, "task.view_all");
}

export function homeForUser(user: User): string {
  if (isClientUser(user)) return "/client";
  return isAdminUser(user) ? "/admin" : "/week";
}

export async function requireAdmin(): Promise<User> {
  const user = await getSessionUser();
  if (!user || !user.isActive) redirect("/login?portal=admin");
  if (isClientUser(user)) redirect("/client");
  if (!isAdminUser(user)) redirect("/week");
  return user;
}

export async function requireEditorPortal(): Promise<User> {
  const user = await getSessionUser();
  if (!user || !user.isActive) redirect("/login?portal=editor");
  if (isClientUser(user)) redirect("/client");
  if (isAdminUser(user)) redirect("/admin");
  return user;
}

export async function requireClientPortal(): Promise<User> {
  const user = await getSessionUser();
  if (!user || !user.isActive) redirect("/login?portal=client");
  if (!isClientUser(user)) redirect(homeForUser(user));
  return user;
}
