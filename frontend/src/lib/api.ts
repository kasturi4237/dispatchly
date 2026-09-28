import {
  SessionUser,
  PagedResult,
  MessageRecord,
  StatsResponse,
  LaunchCampaignPayload,
  LaunchCampaignResult,
  ApiFieldError,
} from "../types";

const SESSION_TOKEN_KEY = "dispatchly_session_token";

function apiBase(): string {
  return (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

export function storeSessionToken(token: string) {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}
export function readSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}
export function clearSessionToken() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  fields?: ApiFieldError[];
  constructor(message: string, status: number, fields?: ApiFieldError[]) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = readSessionToken();
  const res = await fetch(`${apiBase()}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    let body: { error?: { message?: string; details?: ApiFieldError[] } } | null = null;
    try {
      body = await res.json();
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new ApiError(
      body?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      body?.error?.details
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const authApi = {
  googleLoginUrl: () => `${apiBase()}/api/auth/google`,
  session: () => request<{ user: SessionUser }>("/api/auth/session"),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
};

export const campaignApi = {
  stats: () => request<StatsResponse>("/api/campaigns/stats"),
  upcoming: (limit: number, offset: number, q?: string) =>
    request<PagedResult<MessageRecord>>(
      `/api/campaigns/upcoming?limit=${limit}&offset=${offset}${q ? `&q=${encodeURIComponent(q)}` : ""}`
    ),
  delivered: (limit: number, offset: number, q?: string) =>
    request<PagedResult<MessageRecord>>(
      `/api/campaigns/delivered?limit=${limit}&offset=${offset}${q ? `&q=${encodeURIComponent(q)}` : ""}`
    ),
  launch: (payload: LaunchCampaignPayload) =>
    request<LaunchCampaignResult>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
