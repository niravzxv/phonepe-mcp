#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { PhonePeApiException, PhonePeClient } from "./phonepe/client.js";
import { buildCreatePaymentTool } from "./tools/create-payment.js";
import { buildGetOrderStatusTool } from "./tools/get-order-status.js";
import { buildInitiateRefundTool } from "./tools/initiate-refund.js";
import { buildGetRefundStatusTool } from "./tools/get-refund-status.js";
import { buildVerifyWebhookSignatureTool } from "./tools/verify-webhook-signature.js";

async function main() {
  const config = loadConfig();
  const client = new PhonePeClient(config);

  const server = new McpServer({
    name: "phonepe-mcp",
    version: "0.0.1",
  });

  function wrap<A>(handler: (a: A) => Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }>) {
    return async (args: A) => {
      try {
        return await handler(args);
      } catch (err) {
        const message =
          err instanceof PhonePeApiException
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err);
        return {
          isError: true,
          content: [{ type: "text" as const, text: message }],
        };
      }
    };
  }

  const createPayment = buildCreatePaymentTool(client);
  server.registerTool(createPayment.name, createPayment.config, wrap(createPayment.handler));

  const orderStatus = buildGetOrderStatusTool(client);
  server.registerTool(orderStatus.name, orderStatus.config, wrap(orderStatus.handler));

  const refund = buildInitiateRefundTool(client);
  server.registerTool(refund.name, refund.config, wrap(refund.handler));

  const refundStatus = buildGetRefundStatusTool(client);
  server.registerTool(refundStatus.name, refundStatus.config, wrap(refundStatus.handler));

  const verifyWebhook = buildVerifyWebhookSignatureTool(config);
  server.registerTool(verifyWebhook.name, verifyWebhook.config, wrap(verifyWebhook.handler));

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`phonepe-mcp running on stdio (env=${config.environment})\n`);
}

main().catch((err) => {
  process.stderr.write(`phonepe-mcp failed to start: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
