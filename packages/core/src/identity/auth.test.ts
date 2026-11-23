import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Db, User } from "@eth/db";
import {
  LOGIN_FAILED_MESSAGE,
  createClientUser,
  loginWithTelegramId,
  loginWithUsername,
  setUserPassword,
} from "./auth.js";
import { PermissionError, ValidationError } from "./permissions.js";

function actor(partial: Partial<User> & Pick<User, "role">): User {
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

const dbNever = new Proxy({} as Db, {
  get() {
    throw new Error("db should not be queried");
  },
});

describe("login validation", () => {
  it("rejects non-numeric telegram id before db", async () => {
    await assert.rejects(
      () => loginWithTelegramId(dbNever, "12ab", "secret"),
      (err) => err instanceof ValidationError,
    );
  });

  it("rejects empty password", async () => {
    await assert.rejects(
      () => loginWithTelegramId(dbNever, "12345", ""),
      (err) => err instanceof ValidationError,
    );
    await assert.rejects(
      () => loginWithUsername(dbNever, "brand.studio", ""),
      (err) => err instanceof ValidationError,
    );
  });

  it("uses the same failure message for invalid username shape", async () => {
    await assert.rejects(
      () => loginWithUsername(dbNever, "bad name!", "secret-1"),
      (err) =>
        err instanceof PermissionError && err.message === LOGIN_FAILED_MESSAGE,
    );
  });

  it("does not query db for oversized password on telegram login", async () => {
    await assert.rejects(
      () => loginWithTelegramId(dbNever, "12345", "x".repeat(300)),
      (err) =>
        err instanceof PermissionError && err.message === LOGIN_FAILED_MESSAGE,
    );
  });
});

describe("client user password rules", () => {
  it("blocks editors from creating a client login", async () => {
    await assert.rejects(
      () =>
        createClientUser(dbNever, actor({ role: "editor" }), {
          clientId: "c1",
          username: "brand.studio",
          password: "secret-1",
        }),
      (err) => err instanceof PermissionError,
    );
  });

  it("rejects short client password before db", async () => {
    await assert.rejects(
      () =>
        createClientUser(dbNever, actor({ role: "admin" }), {
          clientId: "c1",
          username: "brand.studio",
          password: "123",
        }),
      (err) => err instanceof ValidationError,
    );
  });

  it("rejects short password reset before db", async () => {
    await assert.rejects(
      () => setUserPassword(dbNever, actor({ role: "admin" }), "u2", "123"),
      (err) => err instanceof ValidationError,
    );
  });
});
