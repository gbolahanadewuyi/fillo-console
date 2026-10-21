/**
 * Browser side of our own authentication (AUTH_PROVIDER=local on the API).
 *
 *  - The short-lived access token lives only in memory (never localStorage, so a script injected into
 *    the page cannot read a long-lived credential). The long-lived refresh token is an httpOnly cookie
 *    the browser sends to /v1/auth/* by itself.
 *  - Reloading the page loses the in-memory token; `refresh()` gets a new one from the cookie, which is
 *    how a returning user stays signed in.
 *  - A timer renews the access token at 80% of its life. Concurrent refreshes share one request.
 *  - This module must not import services/api.ts (api.ts imports this).
 */

export class OwnAuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "OwnAuthError";
  }
}

const apiBase = () => (import.meta.env.VITE_API_URL as string).replace(/\/$/, "");

let accessToken: string | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let inflight: Promise<boolean> | null = null;
const lostListeners = new Set<() => void>();

const RETRY_AFTER_NETWORK_ERROR_MS = 30_000;

export const getAccessToken = (): string | null => accessToken;

/** Called when the session can no longer be renewed (refresh token expired or revoked). */
export function onSessionLost(listener: () => void): () => void {
  lostListeners.add(listener);
  return () => lostListeners.delete(listener);
}

function post(path: string, body?: unknown): Promise<Response> {
  return fetch(`${apiBase()}/auth${path}`, {
    method: "POST",
    credentials: "include", // send/accept the refresh cookie
    headers: { "Content-Type": "application/json", "X-Requested-With": "fillo" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function failure(res: Response): Promise<OwnAuthError> {
  const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  return new OwnAuthError(res.status, data.message || data.error || `HTTP ${res.status}`);
}

function clear(): void {
  accessToken = null;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = undefined;
}

function schedule(delayMs: number): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    const ok = await refresh();
    if (!ok && accessToken === null) lostListeners.forEach((l) => l());
  }, delayMs);
}

function apply(session: { accessToken: string; expiresIn: number }): void {
  accessToken = session.accessToken;
  schedule(Math.max(session.expiresIn * 0.8, 10) * 1000);
}

export async function login(email: string, password: string): Promise<void> {
  const res = await post("/login", { email, password });
  if (!res.ok) throw await failure(res);
  apply(await res.json());
}

/**
 * Exchanges the refresh cookie for a new access token. Resolves true on success. Resolves false when
 * there is no valid session (token cleared) or the network failed (token kept, retried shortly).
 */
export function refresh(): Promise<boolean> {
  inflight ??= (async () => {
    try {
      const res = await post("/refresh");
      if (!res.ok) {
        clear();
        return false;
      }
      apply(await res.json());
      return true;
    } catch {
      // Offline or the API is restarting: do not sign the user out, just try again soon.
      if (accessToken) schedule(RETRY_AFTER_NETWORK_ERROR_MS);
      return false;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function logout(): Promise<void> {
  clear();
  try {
    await post("/logout");
  } catch {
    // The local session is already gone; a failed network call must not block signing out.
  }
}

/** Forgets the session locally without telling the server (used when the server already said 401). */
export function dropSession(): void {
  clear();
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await post("/forgot-password", { email });
  if (!res.ok) throw await failure(res);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const res = await post("/reset-password", { token, newPassword });
  if (!res.ok) throw await failure(res);
}
