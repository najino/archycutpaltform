import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isJalaliPeriodKey,
  isSafeRedirectPath,
  isUuid,
  originAllowed,
  parseOriginHost,
  sniffImageKind,
} from "./http-security.js";

describe("isUuid", () => {
  it("accepts a random UUID v4", () => {
    assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  });

  it("rejects empty, sql, and truncated values", () => {
    assert.equal(isUuid(""), false);
    assert.equal(isUuid("not-a-uuid"), false);
    assert.equal(isUuid("550e8400-e29b-41d4-a716"), false);
    assert.equal(isUuid("'; drop table users;--"), false);
  });
});

describe("isJalaliPeriodKey", () => {
  it("accepts a valid studio month", () => {
    assert.equal(isJalaliPeriodKey("1404-08"), true);
  });

  it("rejects out-of-range months and years", () => {
    assert.equal(isJalaliPeriodKey("1404-13"), false);
    assert.equal(isJalaliPeriodKey("12-08"), false);
    assert.equal(isJalaliPeriodKey("2099-01"), false);
  });
});

describe("isSafeRedirectPath", () => {
  it("allows in-app paths", () => {
    assert.equal(isSafeRedirectPath("/admin"), true);
    assert.equal(isSafeRedirectPath("/week?ok=1"), true);
  });

  it("blocks open redirects", () => {
    assert.equal(isSafeRedirectPath("https://evil.example"), false);
    assert.equal(isSafeRedirectPath("//evil.example"), false);
    assert.equal(isSafeRedirectPath("/\\evil.example"), false);
  });
});

describe("originAllowed", () => {
  const trusted = ["studio.example:443", "localhost:3010"];

  it("denies cross-site even if origin looks trusted", () => {
    assert.equal(
      originAllowed(
        "https://studio.example",
        null,
        "cross-site",
        trusted,
      ),
      false,
    );
  });

  it("allows same-origin fetch", () => {
    assert.equal(
      originAllowed(null, null, "same-origin", trusted),
      true,
    );
  });

  it("allows a matching Origin when fetch-site is absent", () => {
    assert.equal(
      originAllowed("http://localhost:3010", null, null, trusted),
      true,
    );
  });

  it("denies a foreign Origin", () => {
    assert.equal(
      originAllowed("https://evil.example", null, null, trusted),
      false,
    );
  });

  it("denies requests with no origin signal", () => {
    assert.equal(originAllowed(null, null, null, trusted), false);
  });
});

describe("parseOriginHost", () => {
  it("extracts host:port", () => {
    assert.equal(parseOriginHost("http://localhost:3010/login"), "localhost:3010");
  });

  it("rejects garbage", () => {
    assert.equal(parseOriginHost("not a url"), null);
  });
});

describe("sniffImageKind", () => {
  it("detects PNG magic", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.equal(sniffImageKind(png), "png");
  });

  it("rejects a spoofed text file", () => {
    const text = new TextEncoder().encode("not-an-image!!!!");
    assert.equal(sniffImageKind(text), null);
  });
});
