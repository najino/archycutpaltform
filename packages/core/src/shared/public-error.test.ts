import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LOGIN_FAILED_MESSAGE,
  NotFoundError,
  PermissionError,
  ValidationError,
} from "../index.js";
import {
  classifyPublicError,
  lookupErrorParam,
  parseErrorCode,
  parsePublicErrorPayload,
  publicErrorJson,
} from "./public-error.js";

describe("parseErrorCode", () => {
  it("accepts catalog and aliases", () => {
    assert.equal(parseErrorCode("RATE_LIMIT"), "RATE_LIMIT");
    assert.equal(parseErrorCode("rate"), "RATE_LIMIT");
    assert.equal(parseErrorCode("not_found"), "NOT_FOUND");
    assert.equal(parseErrorCode("nope"), null);
  });
});

describe("classifyPublicError", () => {
  it("maps login failure without leaking internals", () => {
    const body = classifyPublicError(new PermissionError(LOGIN_FAILED_MESSAGE));
    assert.equal(body.code, "LOGIN_FAILED");
    assert.equal(body.status, 401);
    assert.equal(body.message, LOGIN_FAILED_MESSAGE);
  });

  it("hides Forbidden: action names", () => {
    const body = classifyPublicError(
      new PermissionError("Forbidden: invoice.manage"),
    );
    assert.equal(body.code, "FORBIDDEN");
    assert.equal(body.message.includes("invoice.manage"), false);
  });

  it("translates English not-found", () => {
    const body = classifyPublicError(new NotFoundError("Invoice not found"));
    assert.equal(body.code, "NOT_FOUND");
    assert.equal(body.message, "فاکتور پیدا نشد.");
  });

  it("keeps Persian validation text", () => {
    const body = classifyPublicError(
      new ValidationError("حداقل یک تسک را انتخاب کنید"),
    );
    assert.equal(body.code, "VALIDATION");
    assert.equal(body.message, "حداقل یک تسک را انتخاب کنید");
  });

  it("maps transition errors", () => {
    const body = classifyPublicError(
      new ValidationError("Cannot transition from todo to approved"),
    );
    assert.equal(body.code, "VALIDATION");
    assert.equal(body.message, "این تغییر وضعیت مجاز نیست.");
  });

  it("maps db crowding to unavailable", () => {
    const body = classifyPublicError(new Error("too many clients already"));
    assert.equal(body.code, "UNAVAILABLE");
    assert.equal(body.status, 503);
  });

  it("maps drizzle failed query without leaking sql", () => {
    const body = classifyPublicError(
      new Error("Failed query: select * from users where id = $1"),
    );
    assert.equal(body.code, "UNAVAILABLE");
    assert.equal(body.message.includes("select"), false);
  });

  it("does not leak unknown English", () => {
    const body = classifyPublicError(new Error("ECONNRESET postgres://x"));
    assert.equal(body.code, "UNAVAILABLE");
    assert.equal(body.message.includes("postgres://"), false);
  });

  it("maps telegram config without leaking env names", () => {
    const body = classifyPublicError(
      new Error("TELEGRAM_BOT_TOKEN تنظیم نشده است"),
    );
    assert.equal(body.code, "UNAVAILABLE");
    assert.equal(body.message.includes("TELEGRAM_BOT_TOKEN"), false);
  });

  it("maps catalog codes thrown as Error", () => {
    assert.equal(classifyPublicError(new Error("FORBIDDEN")).code, "FORBIDDEN");
    assert.equal(classifyPublicError(new Error("RATE_LIMIT")).status, 429);
  });
});

describe("lookupErrorParam", () => {
  it("maps query aliases for flash/login", () => {
    const body = lookupErrorParam("rate");
    assert.equal(body?.code, "RATE_LIMIT");
  });

  it("accepts a Persian detail", () => {
    const body = lookupErrorParam("کارفرما نامعتبر است");
    assert.equal(body?.code, "VALIDATION");
    assert.equal(body?.message, "کارفرما نامعتبر است");
  });
});

describe("publicErrorJson", () => {
  it("keeps the legacy error field", () => {
    const json = publicErrorJson(classifyPublicError(new NotFoundError("x")));
    assert.equal(json.ok, false);
    assert.equal(typeof json.error, "string");
    assert.equal(json.code, "NOT_FOUND");
    assert.equal(json.status, 404);
  });
});

describe("parsePublicErrorPayload", () => {
  it("reads catalog json without leaking unknown english", () => {
    const body = parsePublicErrorPayload(
      { ok: false, code: "RATE_LIMIT", title: "x", error: "stack dump" },
      429,
    );
    assert.equal(body.code, "RATE_LIMIT");
    assert.equal(body.status, 429);
    assert.equal(body.message.includes("stack"), false);
  });

  it("falls back to http status", () => {
    const body = parsePublicErrorPayload({}, 503);
    assert.equal(body.code, "UNAVAILABLE");
  });
});
