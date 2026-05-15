import { z } from "zod";
import type { PhonePeClient } from "../phonepe/client.js";
import type { RefundResponse } from "../phonepe/types.js";

export const initiateRefundInputShape = {
  merchantRefundId: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, digits, underscore, and hyphen are allowed")
    .describe("Unique refund id you generate. Max 63 chars."),
  originalMerchantOrderId: z
    .string()
    .min(1)
    .max(63)
    .describe("The merchantOrderId of the original payment being refunded."),
  amount: z
    .number()
    .int()
    .min(100)
    .describe("Refund amount in PAISA. Minimum 100 = ₹1.00. Cannot exceed the original payment amount."),
};

const InputSchema = z.object(initiateRefundInputShape);

export function buildInitiateRefundTool(client: PhonePeClient) {
  return {
    name: "initiate_refund",
    config: {
      title: "Initiate PhonePe Refund",
      description:
        "Initiate a refund for a previously COMPLETED PhonePe order. The refund is asynchronous — " +
        "the response state will be PENDING. Poll get_refund_status for the final outcome.",
      inputSchema: initiateRefundInputShape,
    },
    handler: async (args: z.infer<typeof InputSchema>) => {
      const result = await client.post<RefundResponse>("/payments/v2/refund", {
        merchantRefundId: args.merchantRefundId,
        originalMerchantOrderId: args.originalMerchantOrderId,
        amount: args.amount,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  };
}
