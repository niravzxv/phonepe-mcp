import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { computeWebhookSignature, verifyWebhookSignature } from "../src/phonepe/webhook.js";

describe("verifyWebhookSignature", () => {
  const username = "merchant_user";
  const password = "s3cret!";
  const expected = createHash("sha256").update(`${username}:${password}`).digest("hex");

  it("computes SHA256(username:password) as hex", () => {
    expect(computeWebhookSignature(username, password)).toBe(expected);
  });

  it("returns true for a matching Authorization header", () => {
    expect(verifyWebhookSignature({ authorizationHeader: expected, username, password })).toBe(true);
  });

  it("trims surrounding whitespace before comparison", () => {
    expect(verifyWebhookSignature({ authorizationHeader: `  ${expected}  `, username, password })).toBe(true);
  });

  it("returns false for a mismatched header", () => {
    expect(verifyWebhookSignature({ authorizationHeader: "deadbeef", username, password })).toBe(false);
  });

  it("returns false for an empty header", () => {
    expect(verifyWebhookSignature({ authorizationHeader: "", username, password })).toBe(false);
  });

  it("returns false when password is wrong", () => {
    expect(verifyWebhookSignature({ authorizationHeader: expected, username, password: "wrong" })).toBe(false);
  });
});
