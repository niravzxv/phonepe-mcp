import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Config } from "../src/config.js";
import { PhonePeApiException, PhonePeClient } from "../src/phonepe/client.js";

const baseConfig: Config = {
  clientId: "client",
  clientSecret: "secret",
  clientVersion: "1",
  environment: "sandbox",
  authUrl: "https://auth.example/oauth/token",
  apiBaseUrl: "https://api.example",
};

function tokenResponse(expiresInSec: number) {
  const now = Math.floor(Date.now() / 1000);
  return new Response(
    JSON.stringify({
      access_token: `tok-${now}`,
      expires_in: expiresInSec,
      issued_at: now,
      expires_at: now + expiresInSec,
      token_type: "O-Bearer",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("PhonePeClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it("fetches a token on first call and attaches it as O-Bearer", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse(3600))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const client = new PhonePeClient(baseConfig, fetchMock as unknown as typeof fetch);
    const result = await client.get<{ ok: boolean }>("/checkout/v2/order/abc/status");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [authUrl, authInit] = fetchMock.mock.calls[0]!;
    expect(authUrl).toBe(baseConfig.authUrl);
    expect((authInit as RequestInit).headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });

    const [apiUrl, apiInit] = fetchMock.mock.calls[1]!;
    expect(apiUrl).toBe(`${baseConfig.apiBaseUrl}/checkout/v2/order/abc/status`);
    const headers = (apiInit as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^O-Bearer tok-/);
  });

  it("reuses a cached token across calls until near expiry", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse(3600))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const client = new PhonePeClient(baseConfig, fetchMock as unknown as typeof fetch);
    await client.get("/a");
    await client.get("/b");

    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 auth + 2 api
  });

  it("refreshes the token when it is within the 60s buffer", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse(30)) // expires in 30s — inside buffer
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(tokenResponse(3600))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const client = new PhonePeClient(baseConfig, fetchMock as unknown as typeof fetch);
    await client.get("/a");
    await client.get("/b");

    expect(fetchMock).toHaveBeenCalledTimes(4); // 2 auth + 2 api
  });

  it("throws PhonePeApiException with parsed code/message on non-2xx", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse(3600))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "BAD_REQUEST", message: "missing field" }), { status: 400 }),
      );

    const client = new PhonePeClient(baseConfig, fetchMock as unknown as typeof fetch);
    await expect(client.post("/checkout/v2/pay", {})).rejects.toMatchObject({
      name: "PhonePeApiException",
      status: 400,
      code: "BAD_REQUEST",
    });
  });

  it("wraps a non-JSON error body without crashing", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse(3600))
      .mockResolvedValueOnce(new Response("plain text failure", { status: 502 }));

    const client = new PhonePeClient(baseConfig, fetchMock as unknown as typeof fetch);
    const err = await client.get("/x").catch((e) => e);
    expect(err).toBeInstanceOf(PhonePeApiException);
    expect((err as PhonePeApiException).status).toBe(502);
  });
});
