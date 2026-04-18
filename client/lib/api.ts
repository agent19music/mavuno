import type { ApiUser, Field, FieldUpdate } from "@/types/models";

function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  if (!base && typeof window !== "undefined") {
    console.warn("NEXT_PUBLIC_API_URL is not set");
  }
  return base;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

type RequestOpts = RequestInit & { skipAuth?: boolean };

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as Record<string, unknown>;

    // Standard DRF shape used across this API.
    if (typeof data.detail === "string") return data.detail;

    // DRF serializer-level errors land under `non_field_errors`.
    const nonField = data.non_field_errors;
    if (Array.isArray(nonField) && typeof nonField[0] === "string") {
      return nonField[0];
    }

    // Field-level errors: { email: ["Enter a valid email."], ... } → first message.
    for (const value of Object.values(data)) {
      if (Array.isArray(value) && typeof value[0] === "string") {
        return value[0];
      }
      if (typeof value === "string") return value;
    }

    return res.statusText || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function apiRequest<T>(path: string, init: RequestOpts = {}): Promise<T> {
  const base = apiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const { skipAuth, ...fetchInit } = init;
  const headers = new Headers(fetchInit.headers);
  if (!skipAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (fetchInit.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(url, {
    ...fetchInit,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !skipAuth && path !== "/api/auth/refresh") {
    const refreshRes = await fetch(`${base}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshRes.ok) {
      const data = (await refreshRes.json()) as { access: string };
      accessToken = data.access;
      headers.set("Authorization", `Bearer ${accessToken}`);
      res = await fetch(url, {
        ...fetchInit,
        headers,
        credentials: "include",
      });
    }
  }

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    apiRequest<{ access: string; user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    }),

  refresh: () =>
    apiRequest<{ access: string }>("/api/auth/refresh", {
      method: "POST",
      skipAuth: true,
    }),

  logout: () =>
    apiRequest<void>("/api/auth/logout", {
      method: "POST",
      skipAuth: true,
    }),

  me: () => apiRequest<ApiUser>("/api/auth/me"),

  fields: () => apiRequest<Field[]>("/api/fields"),

  field: (id: number) => apiRequest<Field>(`/api/fields/${id}`),

  updateField: (id: number, body: Partial<Pick<Field, "name" | "crop_type" | "planting_date" | "current_stage" | "notes">> & { assigned_agent_ids?: number[] }) =>
    apiRequest<Field>(`/api/fields/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteField: (id: number) =>
    apiRequest<void>(`/api/fields/${id}`, {
      method: "DELETE",
    }),

  fieldUpdates: (id: number) => apiRequest<FieldUpdate[]>(`/api/fields/${id}/updates`),

  updates: (limit = 20) =>
    apiRequest<FieldUpdate[]>(`/api/updates?limit=${encodeURIComponent(String(limit))}`),

  dashboardAdmin: () =>
    apiRequest<{
      total_fields: number;
      status_breakdown: Record<string, number>;
      total_agents: number;
      recent_updates: number;
    }>("/api/dashboard/admin"),

  dashboardAgent: () =>
    apiRequest<{
      assigned_fields: number;
      status_breakdown: Record<string, number>;
      my_recent_updates: number;
    }>("/api/dashboard/agent"),

  agents: () => apiRequest<ApiUser[]>("/api/agents"),

  createAgent: (body: { username: string; email: string; password: string; first_name?: string; last_name?: string }) =>
    apiRequest<ApiUser>("/api/agents", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
