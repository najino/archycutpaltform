import type { Task, User, UserRole } from "@eth/db";

export type Action =
  | "task.create"
  | "task.assign"
  | "task.edit_any"
  | "task.edit_own"
  | "task.status.own"
  | "task.status.approve"
  | "task.status.reject"
  | "task.view_all"
  | "deliverable.submit"
  | "invite.create"
  | "member.add"
  | "member.promote"
  | "settings.manage"
  | "stats.view_all"
  | "project.manage"
  | "earnings.view_all"
  | "earnings.view_own"
  | "invoice.manage"
  | "invoice.pay";

const ROLE_ACTIONS: Record<UserRole, Action[]> = {
  owner: [
    "task.create",
    "task.assign",
    "task.edit_any",
    "task.edit_own",
    "task.status.own",
    "task.status.approve",
    "task.status.reject",
    "task.view_all",
    "deliverable.submit",
    "invite.create",
    "member.add",
    "member.promote",
    "settings.manage",
    "stats.view_all",
    "project.manage",
    "earnings.view_all",
    "earnings.view_own",
    "invoice.manage",
    "invoice.pay",
  ],
  admin: [
    "task.create",
    "task.assign",
    "task.edit_any",
    "task.edit_own",
    "task.status.own",
    "task.status.approve",
    "task.status.reject",
    "task.view_all",
    "deliverable.submit",
    "invite.create",
    "member.add",
    "settings.manage",
    "stats.view_all",
    "project.manage",
    "earnings.view_all",
    "earnings.view_own",
    "invoice.manage",
    "invoice.pay",
  ],
  editor: [
    "task.create",
    "task.edit_own",
    "task.status.own",
    "deliverable.submit",
    "earnings.view_own",
  ],
};

export function can(user: User, action: Action): boolean {
  if (!user.isActive) return false;
  return ROLE_ACTIONS[user.role].includes(action);
}

export function assertCan(user: User, action: Action): void {
  if (!can(user, action)) {
    throw new PermissionError(`Forbidden: ${action}`);
  }
}

export function canModifyTask(user: User, task: Task): boolean {
  if (!user.isActive) return false;
  if (task.invoiceId) return false;
  if (can(user, "task.edit_any")) return true;
  return can(user, "task.edit_own") && task.assigneeId === user.id;
}

export function assertCanModifyTask(user: User, task: Task): void {
  if (task.invoiceId) {
    throw new PermissionError("Invoiced tasks cannot be edited");
  }
  if (!canModifyTask(user, task)) {
    throw new PermissionError("Forbidden: cannot modify this task");
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
