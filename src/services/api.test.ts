/** The API client in own-auth mode: bearer token, silent renewal on 401, and no infinite retry. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "https://api.test/v1";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const session = (token: string) => json(200, { accessToken: token, expiresIn: 900, tokenType: "Bearer" });

vi.mock("@/lib/firebase", () => ({ firebaseAuth: {}, getAuthToken: () => null }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));

let fetchMock: ReturnType<typeof vi.fn>;

async function load() {
  vi.resetModules();
  const own = await import("@/lib/own-auth");
  const api = await import("./api");
  return { own, api };
}

beforeEach(() => {
  vi.stubEnv("VITE_API_URL", BASE);
  vi.stubEnv("VITE_AUTH_PROVIDER", "local");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(window, "location", { value: { href: "/" }, writable: true });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const authHeader = (callIndex: number) => (fetchMock.mock.calls[callIndex]![1].headers as Record<string, string>).Authorization;

describe("apiRequest with own auth", () => {
  it("sends the in-memory access token as a bearer token", async () => {
    fetchMock.mockResolvedValueOnce(session("tok-1")).mockResolvedValueOnce(json(200, { ok: true }));
    const { own, api } = await load();
    await own.login("a@fillo.cloud", "pw");
    await expect(api.apiRequest("GET", "/control/me")).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[1]![0]).toBe(`${BASE}/control/me`);
    expect(authHeader(1)).toBe("Bearer tok-1");
  });

  it("on 401 renews the session once and retries with the new token", async () => {
    fetchMock
      .mockResolvedValueOnce(session("tok-1")) // login
      .mockResolvedValueOnce(json(401, { message: "expired" })) // first attempt
      .mockResolvedValueOnce(session("tok-2")) // refresh
      .mockResolvedValueOnce(json(200, { ok: true })); // retry
    const { own, api } = await load();
    await own.login("a@fillo.cloud", "pw");
    await expect(api.apiRequest("GET", "/control/stats")).resolves.toEqual({ ok: true });
    expect(authHeader(1)).toBe("Bearer tok-1");
    expect(fetchMock.mock.calls[2]![0]).toBe(`${BASE}/auth/refresh`);
    expect(authHeader(3)).toBe("Bearer tok-2");
  });

  it("gives up (and sends the user to login) if renewal is refused", async () => {
    fetchMock
      .mockResolvedValueOnce(session("tok-1"))
      .mockResolvedValueOnce(json(401, { message: "expired" }))
      .mockResolvedValueOnce(json(401, { message: "Session expired" })); // refresh refused
    const { own, api } = await load();
    await own.login("a@fillo.cloud", "pw");
    await expect(api.apiRequest("GET", "/control/stats")).rejects.toMatchObject({ status: 401, code: "unauthenticated" });
    expect(window.location.href).toBe("/login");
    expect(own.getAccessToken()).toBeNull();
  });

  it("does not loop: a second 401 after a successful renewal ends the session", async () => {
    fetchMock
      .mockResolvedValueOnce(session("tok-1"))
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(session("tok-2"))
      .mockResolvedValueOnce(json(401, {}));
    const { own, api } = await load();
    await own.login("a@fillo.cloud", "pw");
    await expect(api.apiRequest("GET", "/control/stats")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("restores the token from the cookie before the first request after a page reload", async () => {
    fetchMock.mockResolvedValueOnce(session("restored")).mockResolvedValueOnce(json(200, { me: 1 }));
    const { api } = await load();
    await expect(api.apiRequest("GET", "/control/me")).resolves.toEqual({ me: 1 });
    expect(fetchMock.mock.calls[0]![0]).toBe(`${BASE}/auth/refresh`);
    expect(authHeader(1)).toBe("Bearer restored");
  });

  it("fails cleanly with no session at all", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { message: "Not signed in" }));
    const { api } = await load();
    await expect(api.apiRequest("GET", "/control/me")).rejects.toMatchObject({ status: 401, code: "unauthenticated" });
  });

  it("surfaces non-401 errors normally and does not renew", async () => {
    fetchMock.mockResolvedValueOnce(session("tok-1")).mockResolvedValueOnce(json(403, { message: "Platform access requires a Fillo control-plane account" }));
    const { own, api } = await load();
    await own.login("a@fillo.cloud", "pw");
    await expect(api.apiRequest("GET", "/control/me")).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
