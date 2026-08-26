import { signOut } from "firebase/auth";
import { firebaseAuth, getAuthToken } from "@/lib/firebase";

const API_BASE = import.meta.env.VITE_API_URL as string;

const REQUEST_TIMEOUT_MS = 15_000;

type Method = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let loggingOut = false;

function handleSessionExpired(): never {
  if (!loggingOut) {
    loggingOut = true;
    signOut(firebaseAuth).catch(() => {});
    window.location.href = "/login";
  }
  throw new ApiError(401, "Session expired. Please log in again.", "unauthenticated");
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(408, "Request timed out. Please try again.", "timeout");
    }
    if (err instanceof TypeError) {
      throw new ApiError(0, "Network error. Please check your internet connection and try again.", "network_error");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiRequest<T = unknown>(
  method: Method,
  path: string,
  body?: unknown,
  requiresAuth = true,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined };

  if (!requiresAuth) {
    const res = await fetchWithTimeout(`${API_BASE}${path}`, init);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new ApiError(res.status, err.error || err.message || `HTTP ${res.status}`, err.code);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  const token = getAuthToken();
  if (!token) throw new ApiError(401, "Not authenticated", "unauthenticated");

  headers["Authorization"] = `Bearer ${token}`;
  const res = await fetchWithTimeout(`${API_BASE}${path}`, init);

  if (res.status === 401) handleSessionExpired();

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new ApiError(res.status, err.error || err.message || `HTTP ${res.status}`, err.code);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function extractArray<T>(raw: unknown, hint?: string): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (hint && Array.isArray(obj[hint])) return obj[hint] as T[];
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return val as T[];
    }
    const nested = obj.data;
    if (nested && typeof nested === "object") {
      if (Array.isArray(nested)) return nested as T[];
      const inner = nested as Record<string, unknown>;
      if (hint && Array.isArray(inner[hint])) return inner[hint] as T[];
      for (const val of Object.values(inner)) {
        if (Array.isArray(val)) return val as T[];
      }
    }
  }
  return [];
}

// Helper for query ?page&pageSize building
export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
