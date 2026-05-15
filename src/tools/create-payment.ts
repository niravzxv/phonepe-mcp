import { z } from "zod";
import type { PhonePeClient } from "../phonepe/client.js";
import type { CreatePaymentResponse } from "../phonepe/types.js";

const merchantOrderIdSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[A-Za-z0-9_-]+$/, "Only letters, digits, underscore, and hyphen are allowed");

export const createPaymentInputShape = {
  merchantOrderId: merchantOrderIdSchema.describe(
    "Unique order id you generate. Max 63 chars, alphanumerics + underscore + hyphen only.",
  ),
  amount: z
    .number()
    .int()
    .min(100)
    .describe("Amount in PAISA (Indian minor units). Minimum 100 = ₹1.00. ₹250 = 25000."),
  redirectUrl: z.string().url().describe("Where PhonePe should redirect the customer after payment completes."),
  expireAfter: z
    .number()
    .int()
    .min(300)
    .max(3600)
    .optional()
    .describe("Seconds until the checkout link expires. PhonePe allows 300–3600. Omit for the default."),
  message: z.string().max(160).optional().describe("Optional message shown on the checkout page."),
  metaInfo: z
    .record(z.string(), z.string())
    .optional()
    .describe("Free-form merchant metadata (udf1..udf10 ≤256 chars, udf11..udf15 ≤50 alphanumeric)."),
};

const InputSchema = z.object(createPaymentInputShape);

export function buildCreatePaymentTool(client: PhonePeClient) {
  return {
    name: "create_payment",
    config: {
      title: "Create PhonePe Payment",
      description:
        "Create a PhonePe Standard Checkout v2 payment and return a hosted checkout URL the customer can be redirected to. " +
        "IMPORTANT: amount is in PAISA (₹1 = 100). merchantOrderId must be unique per attempt.",
      inputSchema: createPaymentInputShape,
    },
    handler: async (args: z.infer<typeof InputSchema>) => {
      const body = {
        merchantOrderId: args.merchantOrderId,
        amount: args.amount,
        ...(args.expireAfter !== undefined ? { expireAfter: args.expireAfter } : {}),
        ...(args.metaInfo ? { metaInfo: args.metaInfo } : {}),
        paymentFlow: {
          type: "PG_CHECKOUT" as const,
          ...(args.message ? { message: args.message } : {}),
          merchantUrls: { redirectUrl: args.redirectUrl },
        },
      };
      const result = await client.post<CreatePaymentResponse>("/checkout/v2/pay", body);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  };
}
