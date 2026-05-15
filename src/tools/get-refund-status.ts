import { z } from "zod";
import type { PhonePeClient } from "../phonepe/client.js";
import type { RefundStatusResponse } from "../phonepe/types.js";

export const getRefundStatusInputShape = {
  merchantRefundId: z
    .string()
    .min(1)
    .max(63)
    .describe("The merchantRefundId used when initiate_refund was called."),
};

const InputSchema = z.object(getRefundStatusInputShape);

export function buildGetRefundStatusTool(client: PhonePeClient) {
  return {
    name: "get_refund_status",
    config: {
      title: "Get PhonePe Refund Status",
      description: "Fetch the status of a PhonePe refund by merchantRefundId. State is PENDING, COMPLETED, or FAILED.",
      inputSchema: getRefundStatusInputShape,
    },
    handler: async (args: z.infer<typeof InputSchema>) => {
      const path = `/payments/v2/refund/${encodeURIComponent(args.merchantRefundId)}/status`;
      const result = await client.get<RefundStatusResponse>(path);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  };
}
