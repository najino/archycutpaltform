import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Task, User } from "@eth/db";
import {
  assertCan,
  can,
  canModifyTask,
  canTransition,
  isClientUser,
  isStudioUser,
  PermissionError,
} from "../index.js";

function user(partial: Partial<User> & Pick<User, "role">): User {
  return {
    id: "u1",
    telegramId: 1n,
    username: null,
    displayName: "Test",
    passwordHash: null,
    clientId: null,
    isActive: true,
    createdAt: new Date(),
    ...partial,
  };
}

function task(partial: Partial<Task> = {}): Task {
  return {
    id: "t1",
    shortCode: "T-0001",
    title: "Test",
    description: null,
    assigneeId: "u1",
    createdBy: "u2",
    clientId: null,
    categoryId: null,
    videoType: null,
    status: "todo",
    dueDate: null,
    weekKey: "2026-W46",
    createdAt: new Date(),
    updatedAt: new Date(),
    projectId: null,
    units: 1,
    unitPriceSnapshot: null,
    amount: null,
    approvedAt: null,
    invoiceId: null,
    ...partial,
  };
}

describe("permissions", () => {
  it("editor cannot approve", () => {
    assert.equal(can(user({ role: "editor" }), "task.status.approve"), false);
  });

  it("admin can approve", () => {
    assert.equal(can(user({ role: "admin" }), "task.status.approve"), true);
  });

  it("only owner can promote", () => {
    assert.equal(can(user({ role: "admin" }), "member.promote"), false);
    assert.equal(can(user({ role: "owner" }), "member.promote"), true);
  });

  it("editor can modify own task only", () => {
    const editor = user({ id: "e1", role: "editor" });
    assert.equal(canModifyTask(editor, task({ assigneeId: "e1" })), true);
    assert.equal(canModifyTask(editor, task({ assigneeId: "other" })), false);
  });

  it("client can only view own projects and invoices", () => {
    const client = user({ role: "client", clientId: "c1" });
    assert.equal(can(client, "project.view_own"), true);
    assert.equal(can(client, "invoice.view_project"), true);
    assert.equal(can(client, "invoice.manage"), false);
    assert.equal(can(client, "task.view_all"), false);
    assert.equal(can(client, "project.manage"), false);
  });

  it("invoiced tasks are locked", () => {
    const editor = user({ id: "e1", role: "editor" });
    assert.equal(
      canModifyTask(editor, task({ assigneeId: "e1", invoiceId: "inv1" })),
      false,
    );
  });

  it("inactive users have no actions", () => {
    const admin = user({ role: "admin", isActive: false });
    assert.equal(can(admin, "invoice.manage"), false);
    assert.equal(canModifyTask(admin, task({ assigneeId: "u1" })), false);
  });

  it("classifies studio vs client", () => {
    assert.equal(isClientUser(user({ role: "client", clientId: "c1" })), true);
    assert.equal(isStudioUser(user({ role: "client", clientId: "c1" })), false);
    assert.equal(isStudioUser(user({ role: "editor" })), true);
    assert.equal(isStudioUser(user({ role: "admin" })), true);
  });

  it("assertCan throws PermissionError", () => {
    assert.throws(
      () => assertCan(user({ role: "editor" }), "invoice.manage"),
      PermissionError,
    );
  });
});

describe("status transitions", () => {
  it("allows happy path", () => {
    assert.equal(canTransition("todo", "in_progress"), true);
    assert.equal(canTransition("in_progress", "delivered"), true);
    assert.equal(canTransition("delivered", "approved"), true);
    assert.equal(canTransition("delivered", "rejected"), true);
    assert.equal(canTransition("rejected", "in_progress"), true);
  });

  it("blocks illegal jumps", () => {
    assert.equal(canTransition("todo", "approved"), false);
    assert.equal(canTransition("approved", "rejected"), false);
    assert.equal(canTransition("delivered", "todo"), false);
  });
});
