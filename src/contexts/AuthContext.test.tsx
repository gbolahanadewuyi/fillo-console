/** The console's role comes from the API's /control/me and nowhere else: never guessed from the email address. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { ApiError } from "@/services/api";

const { apiRequest, own } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  own: { login: vi.fn(), logout: vi.fn(), refresh: vi.fn(), onSessionLost: vi.fn(() => () => undefined), forgotPassword: vi.fn() },
}));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, apiRequest };
});
vi.mock("@/lib/own-auth", () => ({ ...own, OwnAuthError: class extends Error { status = 401; } }));
vi.mock("@/lib/auth-mode", () => ({ isLocalAuth: true }));
vi.mock("@/lib/firebase", () => ({ firebaseAuth: { onAuthStateChanged: () => () => undefined }, primeAuthToken: vi.fn() }));
vi.mock("firebase/auth", () => ({ signInWithEmailAndPassword: vi.fn(), signOut: vi.fn(), sendPasswordResetEmail: vi.fn() }));

import { AuthProvider, useAuth } from "./AuthContext";

type Ctx = ReturnType<typeof useAuth>;
let ctx: Ctx;
function Probe() {
  ctx = useAuth();
  return null;
}
async function mount() {
  await act(async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
}

beforeEach(() => {
  apiRequest.mockReset();
  Object.values(own).forEach((f) => f.mockClear?.());
  own.refresh.mockResolvedValue(false);
  own.login.mockResolvedValue(undefined);
  own.logout.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.clearAllMocks();
});

/** Sign in and hand back the failure, if any. (act() returns a thenable that expect(...).rejects does not follow.) */
async function loginFailure(email: string): Promise<unknown> {
  try {
    await act(() => ctx.login(email, "a-long-password"));
  } catch (e) {
    return e;
  }
  return undefined;
}

describe("console sign-in", () => {
  it("takes the role from /control/me, whatever the email looks like", async () => {
    apiRequest.mockResolvedValue({ uid: "u1", email: "owner@fillo.cloud", displayName: "Someone", platformRole: "platform_support" });
    await mount();
    expect(await loginFailure("owner@fillo.cloud")).toBeUndefined();
    expect(ctx.user?.platformRole).toBe("platform_support"); // "owner@" did not make them an owner
  });

  it("does not invent a role when the control plane has no answer: it ends the session", async () => {
    apiRequest.mockImplementation(() => Promise.reject(new ApiError(404, "Not found")));
    await mount();
    expect(await loginFailure("owner@fillo.cloud")).toMatchObject({ status: 503 });
    expect(ctx.user).toBeNull();
    expect(own.logout).toHaveBeenCalled();
  });

  it("refuses an account that is not platform staff and signs it out", async () => {
    apiRequest.mockImplementation(() => Promise.reject(new ApiError(403, "Forbidden")));
    await mount();
    expect(await loginFailure("someone@fillo.cloud")).toMatchObject({ status: 403 });
    expect(ctx.user).toBeNull();
    expect(own.logout).toHaveBeenCalled();
  });

  it("does not accept any email just because it is a development build", async () => {
    await mount();
    expect(await loginFailure("anyone@example.com")).toMatchObject({ status: 401 });
    expect(own.login).not.toHaveBeenCalled();
  });
});
