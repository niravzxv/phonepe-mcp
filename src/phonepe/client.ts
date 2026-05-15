import type { Config } from "../config.js";
import type { AuthTokenResponse, PhonePeApiError } from "./types.js";

const TOKEN_REFRESH_BUFFER_SECONDS = 60;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export class PhonePeApiException extends Error {
  status: number;
  code?: string;
  data?: unknown;
  constructor(status: number, body: PhonePeApiError | string) {
    const parsed = typeof body === "string" ? { message: body } : body;
    super(
      `PhonePe API error ${status}` +
        (parsed.code ? ` [${parsed.code}]` : "") +
        (parsed.message ? `: ${parsed.message}` : ""),
    );
    this.name = "PhonePeApiException";
    this.status = status;
    this.code = parsed.code;
    this.data = parsed.data;
  }
}

type FetchFn = typeof fetch;

export class PhonePeClient {
  private token: CachedToken | null = null;
  private inflightAuth: Promise<CachedToken> | null = null;

  constructor(
    private readonly config: Config,
    private readonly fetchImpl: FetchFn = fetch,
  ) {}

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const token = await this.getToken();
    const url = `${this.config.apiBaseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `O-Bearer ${token}`,
      Accept: "application/json",
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await this.fetchImpl(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    if (!response.ok) {
      let parsed: PhonePeApiError | string = text;
      try {
        parsed = JSON.parse(text) as PhonePeApiError;
      } catch {
        // keep raw text
      }
      throw new PhonePeApiException(response.status, parsed);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  private async getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && this.token.expiresAt - now > TOKEN_REFRESH_BUFFER_SECONDS) {
      return this.token.accessToken;
    }
    if (!this.inflightAuth) {
      this.inflightAuth = this.fetchToken().finally(() => {
        this.inflightAuth = null;
      });
    }
    const fresh = await this.inflightAuth;
    this.token = fresh;
    return fresh.accessToken;
  }

  private async fetchToken(): Promise<CachedToken> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_version: this.config.clientVersion,
      client_secret: this.config.clientSecret,
      grant_type: "client_credentials",
    });
    const response = await this.fetchImpl(this.config.authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await response.text();
    if (!response.ok) {
      let parsed: PhonePeApiError | string = text;
      try {
        parsed = JSON.parse(text) as PhonePeApiError;
      } catch {
        // keep raw text
      }
      throw new PhonePeApiException(response.status, parsed);
    }
    const data = JSON.parse(text) as AuthTokenResponse;
    return { accessToken: data.access_token, expiresAt: data.expires_at };
  }
}
