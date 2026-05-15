import { z } from "zod";

const EnvSchema = z.object({
  PHONEPE_CLIENT_ID: z.string().min(1, "PHONEPE_CLIENT_ID is required"),
  PHONEPE_CLIENT_SECRET: z.string().min(1, "PHONEPE_CLIENT_SECRET is required"),
  PHONEPE_CLIENT_VERSION: z.string().min(1, "PHONEPE_CLIENT_VERSION is required"),
  PHONEPE_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  PHONEPE_WEBHOOK_USERNAME: z.string().optional(),
  PHONEPE_WEBHOOK_PASSWORD: z.string().optional(),
});

export type Environment = "sandbox" | "production";

export interface Config {
  clientId: string;
  clientSecret: string;
  clientVersion: string;
  environment: Environment;
  authUrl: string;
  apiBaseUrl: string;
  webhookUsername?: string;
  webhookPassword?: string;
}

const URLS = {
  sandbox: {
    auth: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
    api: "https://api-preprod.phonepe.com/apis/pg-sandbox",
  },
  production: {
    auth: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    api: "https://api.phonepe.com/apis/pg",
  },
} as const;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid PhonePe MCP configuration:\n${issues}`);
  }
  const e = parsed.data;
  const urls = URLS[e.PHONEPE_ENV];
  return {
    clientId: e.PHONEPE_CLIENT_ID,
    clientSecret: e.PHONEPE_CLIENT_SECRET,
    clientVersion: e.PHONEPE_CLIENT_VERSION,
    environment: e.PHONEPE_ENV,
    authUrl: urls.auth,
    apiBaseUrl: urls.api,
    webhookUsername: e.PHONEPE_WEBHOOK_USERNAME,
    webhookPassword: e.PHONEPE_WEBHOOK_PASSWORD,
  };
}
