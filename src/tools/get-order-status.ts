import { z } from "zod";
import type { PhonePeClient } from "../phonepe/client.js";
import type { OrderStatusResponse } from "../phonepe/types.js";

export const getOrderStatusInputShape = {
  merchantOrderId: z
    .string()
    .min(1)
    .max(63)
    .describe("The merchantOrderId used when create_payment was called."),
  details: z
    .boolean()
    .optional()
    .describe("If true, returns every payment attempt. If false (default), returns only the latest attempt."),
  errorContext: z
    .boolean()
    .optional()
    .describe("If true (default), includes error context when state is FAILED."),
};

const InputSchema = z.object(getOrderStatusInputShape);

export function buildGetOrderStatusTool(client: PhonePeClient) {
  return {
    name: "get_order_status",
    config: {
      title: "Get PhonePe Order Status",
      description:
        "Fetch the status of a PhonePe order by merchantOrderId. State is PENDING, COMPLETED, or FAILED. " +
        "Rely on the top-level `state` field for the authoritative payment outcome.",
      inputSchema: getOrderStatusInputShape,
    },
    handler: async (args: z.infer<typeof InputSchema>) => {
      const params = new URLSearchParams();
      if (args.details !== undefined) params.set("details", String(args.details));
      if (args.errorContext !== undefined) params.set("errorContext", String(args.errorContext));
      const qs = params.toString();
      const path = `/checkout/v2/order/${encodeURIComponent(args.merchantOrderId)}/status${qs ? `?${qs}` : ""}`;
      const result = await client.get<OrderStatusResponse>(path);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  };
}
