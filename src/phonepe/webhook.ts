import { createHash, timingSafeEqual } from "node:crypto";

export interface VerifyWebhookArgs {
  authorizationHeader: string;
  username: string;
  password: string;
}

export function computeWebhookSignature(username: string, password: string): string {
  return createHash("sha256").update(`${username}:${password}`).digest("hex");
}

export function verifyWebhookSignature({ authorizationHeader, username, password }: VerifyWebhookArgs): boolean {
  const expected = computeWebhookSignature(username, password);
  const received = authorizationHeader.trim();
  if (received.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  } catch {
    return false;
  }
}
