import { z } from "zod";
import type { Config } from "../config.js";
import { verifyWebhookSignature } from "../phonepe/webhook.js";

export const verifyWebhookSignatureInputShape = {
  authorizationHeader: z
    .string()
    .min(1)
    .describe("The value of the `Authorization` header from the incoming PhonePe webhook request."),
  payload: z
    .string()
    .optional()
    .describe(
      "Raw webhook body. Accepted for forward compatibility — PhonePe v2 hashes credentials only, not the body.",
    ),
};

const InputSchema = z.object(verifyWebhookSignatureInputShape);

export function buildVerifyWebhookSignatureTool(config: Config) {
  return {
    name: "verify_webhook_signature",
    config: {
      title: "Verify PhonePe Webhook Signature",
      description:
        "Verify a PhonePe v2 webhook by computing SHA256(username:password) and comparing it against the " +
        "Authorization header (timing-safe). Requires PHONEPE_WEBHOOK_USERNAME and PHONEPE_WEBHOOK_PASSWORD env vars.",
      inputSchema: verifyWebhookSignatureInputShape,
    },
    handler: async (args: z.infer<typeof InputSchema>) => {
      if (!config.webhookUsername || !config.webhookPassword) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "PHONEPE_WEBHOOK_USERNAME and PHONEPE_WEBHOOK_PASSWORD must be set to verify webhooks.",
            },
          ],
        };
      }
      const valid = verifyWebhookSignature({
        authorizationHeader: args.authorizationHeader,
        username: config.webhookUsername,
        password: config.webhookPassword,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ valid }) }],
      };
    },
  };
}
