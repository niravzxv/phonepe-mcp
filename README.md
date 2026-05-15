# phonepe-mcp

Unofficial [Model Context Protocol](https://modelcontextprotocol.io) server for the [PhonePe](https://developer.phonepe.com) Payment Gateway (Standard Checkout v2).

Lets an MCP-capable AI client (Claude Desktop, Claude Code, etc.) create payments, check order status, issue refunds, check refund status, and verify webhook signatures against PhonePe's sandbox or production environments.

> Not affiliated with PhonePe. Use at your own risk. Always test against the sandbox first.

## Tools

| Tool | What it does |
| --- | --- |
| `create_payment` | Creates a Standard Checkout v2 payment and returns a `redirectUrl` for the customer. Amount is in **paisa** (₹1 = 100). |
| `get_order_status` | Fetches status (`PENDING` / `COMPLETED` / `FAILED`) for a `merchantOrderId`. |
| `initiate_refund` | Starts an asynchronous refund against a completed order. |
| `get_refund_status` | Polls refund status by `merchantRefundId`. |
| `verify_webhook_signature` | Verifies an incoming PhonePe webhook by comparing SHA256(`username:password`) to the `Authorization` header (timing-safe). |

OAuth tokens are fetched, cached, and refreshed automatically — there is no exposed auth tool.

## Install

```bash
npm install
npm run build
```

Requires Node.js ≥ 18 (uses native `fetch`).

## Configure

Copy `.env.example` and fill it in:

```bash
cp .env.example .env
```

| Variable | Required | Notes |
| --- | --- | --- |
| `PHONEPE_CLIENT_ID` | yes | From the PhonePe Business merchant dashboard. |
| `PHONEPE_CLIENT_SECRET` | yes | From the merchant dashboard. |
| `PHONEPE_CLIENT_VERSION` | yes | Usually `1`. From the merchant dashboard. |
| `PHONEPE_ENV` | no | `sandbox` (default) or `production`. |
| `PHONEPE_WEBHOOK_USERNAME` | only for webhook verification | Username configured for webhook delivery. |
| `PHONEPE_WEBHOOK_PASSWORD` | only for webhook verification | Password configured for webhook delivery. |

The environment is fixed at server start — there is no per-tool environment toggle. To switch between sandbox and production, restart the server with a different `PHONEPE_ENV`.

## Run

```bash
npm run dev    # tsx watch mode (development)
npm start      # node dist/server.js (after npm run build)
```

The server speaks MCP over stdio.

## Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "phonepe": {
      "command": "node",
      "args": ["/absolute/path/to/phonepe-mcp/dist/server.js"],
      "env": {
        "PHONEPE_CLIENT_ID": "your-client-id",
        "PHONEPE_CLIENT_SECRET": "your-client-secret",
        "PHONEPE_CLIENT_VERSION": "1",
        "PHONEPE_ENV": "sandbox"
      }
    }
  }
}
```

Then restart Claude Desktop. The tools above will be available in any conversation.

## Debug with MCP Inspector

```bash
PHONEPE_CLIENT_ID=... PHONEPE_CLIENT_SECRET=... PHONEPE_CLIENT_VERSION=1 \
  npx @modelcontextprotocol/inspector tsx src/server.ts
```

## Test

```bash
npm test
```

Unit tests cover webhook signature verification and token-cache behavior with a mocked `fetch` — no live PhonePe calls are made.

## API references

- [Authorization](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization)
- [Create Payment](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment)
- [Order Status](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status)
- [Refund](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/refund)

## License

MIT
