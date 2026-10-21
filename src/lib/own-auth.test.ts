import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "https://api.test/v1";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const session = (token: string, expiresIn = 900) => json(200, { accessToken: token, expiresIn, tokenType: "Bearer" });

let fetchMock: ReturnType<typeof vi.fn>;

async function load() {
  vi.resetModules();
  return import("./own-auth");
}

beforeEach(() => {
  vi.stubEnv("VITE_API_URL", BASE);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("login", () => {
  it("posts the credentials with the cookie and CSRF header, and keeps the access token in memory", async () => {
    fetchMock.mockResolvedValueOnce(session("tok-1"));
    const auth = await load();
    await auth.login("a@fillo.cloud", "pw-pw-pw-pw-1");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${BASE}/auth/login`);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.headers["X-Requested-With"]).toBe("fillo");
    expect(JSON.parse(init.body)).toEqual({ email: "a@fillo.cloud", password: "pw-pw-pw-pw-1" });
    expect(auth.getAccessToken()).toBe("tok-1");
    // The token must never be written to browser storage, where any injected script could read it.
    const stored = [window.localStorage, window.sessionStorage]
      .map((area) => {
        try {
          return JSON.stringify(Object.entries(area));
        } catch {
          return "";
        }
      })
      .join("");
    expect(stored).not.toContain("tok-1");
  });

  it("surfaces the API's message on failure and stores nothing", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error: "unauthorized", message: "Invalid email or password" }));
    const auth = await load();
    await expect(auth.login("a@fillo.cloud", "nope")).rejects.toMatchObject({ name: "OwnAuthError", status: 401, message: "Invalid email or password" });
    expect(auth.getAccessToken()).toBeNull();
  });
});

describe("refresh", () => {
  it("shares one request between simultaneous callers", async () => {
    fetchMock.mockResolvedValue(session("tok-2"));
    const auth = await load();
    const results = await Promise.all([auth.refresh(), auth.refresh(), auth.refresh()]);
    expect(results).toEqual([true, true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(auth.getAccessToken()).toBe("tok-2");
  });

  it("clears the token and reports false when the session is gone", async () => {
    fetchMock.mockResolvedValueOnce(session("tok-1")).mockResolvedValueOnce(json(401, { message: "Session expired" }));
    const auth = await load();
    await auth.login("a@fillo.cloud", "pw");
    expect(await auth.refresh()).toBe(false);
    expect(auth.getAccessToken()).toBeNull();
  });

  it("keeps the token when the network fails (offline is not a sign-out)", async () => {
    fetchMock.mockResolvedValueOnce(session("tok-1")).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const auth = await load();
    await auth.login("a@fillo.cloud", "pw");
    expect(await auth.refresh()).toBe(false);
    expect(auth.getAccessToken()).toBe("tok-1");
  });

  it("can start a new refresh after the previous one finished", async () => {
    fetchMock.mockResolvedValueOnce(session("a")).mockResolvedValueOnce(session("b"));
    const auth = await load();
    await auth.refresh();
    await auth.refresh();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(auth.getAccessToken()).toBe("b");
  });
});

describe("automatic renewal", () => {
  it("renews the access token at 80% of its life", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(session("tok-1", 900)).mockResolvedValueOnce(session("tok-2", 900));
    const auth = await load();
    await auth.login("a@fillo.cloud", "pw");

    await vi.advanceTimersByTimeAsync(719_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![0]).toBe(`${BASE}/auth/refresh`);
    expect(auth.getAccessToken()).toBe("tok-2");
  });

  it("tells listeners the session is lost when renewal is refused", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(session("tok-1", 900)).mockResolvedValueOnce(json(401, { message: "Session expired" }));
    const auth = await load();
    const lost = vi.fn();
    auth.onSessionLost(lost);
    await auth.login("a@fillo.cloud", "pw");
    await vi.advanceTimersByTimeAsync(721_000);
    expect(lost).toHaveBeenCalledTimes(1);
    expect(auth.getAccessToken()).toBeNull();
  });
});

describe("logout and password endpoints", () => {
  it("logout forgets the token even if the network call fails, and stops renewal", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(session("tok-1")).mockRejectedValueOnce(new TypeError("offline"));
    const auth = await load();
    await auth.login("a@fillo.cloud", "pw");
    await auth.logout();
    expect(auth.getAccessToken()).toBeNull();
    expect(fetchMock.mock.calls[1]![0]).toBe(`${BASE}/auth/logout`);
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(fetchMock).toHaveBeenCalledTimes(2); // no renewal after sign-out
  });

  it("forgotPassword and resetPassword post the right bodies", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
    const auth = await load();
    await auth.forgotPassword("a@fillo.cloud");
    await auth.resetPassword("the-token-value-1234567890", "a-new-long-passphrase");
    expect(fetchMock.mock.calls[0]![0]).toBe(`${BASE}/auth/forgot-password`);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ email: "a@fillo.cloud" });
    expect(fetchMock.mock.calls[1]![0]).toBe(`${BASE}/auth/reset-password`);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ token: "the-token-value-1234567890", newPassword: "a-new-long-passphrase" });
  });

  it("resetPassword reports an expired link with the API's message", async () => {
    fetchMock.mockResolvedValueOnce(json(400, { message: "This reset link is invalid or has expired. Request a new one." }));
    const auth = await load();
    await expect(auth.resetPassword("x".repeat(30), "a-new-long-passphrase")).rejects.toMatchObject({ status: 400, message: /invalid or has expired/ });
  });
});
