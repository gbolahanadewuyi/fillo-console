import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PlatformRole } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
let role: PlatformRole = "platform_support";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: role } }) }));

import UserAccess from "./UserAccess";

type Over = Partial<{ status: "active" | "suspended"; isOwner: boolean; locked: boolean; hasLogin: boolean; invite: unknown; findings: unknown[]; canSignIn: boolean }>;
const access = (o: Over = {}) => ({
  user: { id: "u1", name: "Ada Attendant", email: "ada@gas.test", phone: null, status: o.status ?? "active", isOwner: o.isOwner ?? false, roleName: "Attendant", stationName: "Lekki", companyId: "c1", companyName: "Gas Ltd", createdAt: "2026-01-01T00:00:00Z" },
  signIn: { hasLogin: o.hasLogin ?? true, lastLoginAt: null, passwordUpdatedAt: "2026-01-01T00:00:00Z", failedAttempts: o.locked ? 6 : 0, lockedUntil: o.locked ? "2099-01-01T00:00:00Z" : null },
  invite: o.invite ?? null,
  canSignIn: o.canSignIn ?? true,
  findings: o.findings ?? [],
  recentActivity: [{ id: "a1", action: "order.created", label: "ORD-1", createdAt: "2026-10-01T00:00:00Z" }],
});
const locked = { code: "locked_out", severity: "blocking", title: "Their login is temporarily locked", detail: "Too many wrong passwords.", action: "user.unlock" };

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/users/u1"]}>
        <Routes>
          <Route path="/users/:id" element={<UserAccess />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const mockAccess = (o?: Over) =>
  apiRequest.mockImplementation((method: string) => (method === "GET" ? Promise.resolve(access(o)) : Promise.resolve({ ok: true })));

beforeEach(() => {
  apiRequest.mockReset();
  role = "platform_support";
});

describe("UserAccess", () => {
  it("says why the person is blocked, in the API's words", async () => {
    mockAccess({ canSignIn: false, locked: true, findings: [locked] });
    show();
    expect(await screen.findByText("Cannot use the app right now")).toBeInTheDocument();
    expect(screen.getByText("Their login is temporarily locked")).toBeInTheDocument();
    expect(screen.getByText("Too many wrong passwords.")).toBeInTheDocument();
  });

  it("unlocking asks for a reason and sends exactly it", async () => {
    mockAccess({ canSignIn: false, locked: true, findings: [locked] });
    show();
    fireEvent.click((await screen.findAllByRole("button", { name: "Unlock login" }))[0]!);
    const confirm = screen.getByRole("button", { name: "Unlock" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "  Ada phoned us  " } });
    fireEvent.click(confirm);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/control/users/u1/unlock", { reason: "Ada phoned us" }));
  });

  it("a refused action keeps the dialog open and shows the API's reason", async () => {
    mockAccess({ locked: true, findings: [locked] });
    apiRequest.mockImplementation((method: string) => (method === "GET" ? Promise.resolve(access({ locked: true, findings: [locked] })) : Promise.reject(new ApiError(409, "This person has no login to unlock"))));
    show();
    fireEvent.click((await screen.findAllByRole("button", { name: "Unlock login" }))[0]!);
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "because" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This person has no login to unlock");
  });

  it("support can reset and unlock but is never offered Suspend; admin is", async () => {
    mockAccess();
    show();
    expect(await screen.findByRole("button", { name: "Send reset email" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suspend" })).not.toBeInTheDocument();
  });

  it("admin can suspend an ordinary person, but nobody is offered it for the account owner", async () => {
    role = "platform_admin";
    mockAccess();
    const first = show();
    expect(await screen.findByRole("button", { name: "Suspend" })).toBeInTheDocument();
    first.unmount();
    mockAccess({ isOwner: true });
    show();
    await screen.findByText("Ada Attendant");
    expect(screen.queryByRole("button", { name: "Suspend" })).not.toBeInTheDocument();
  });

  it("finance can look but is offered nothing to change", async () => {
    role = "platform_finance";
    mockAccess({ locked: true, canSignIn: false, findings: [locked] });
    show();
    expect(await screen.findByText("Their login is temporarily locked")).toBeInTheDocument();
    for (const name of ["Unlock login", "Send reset email", "Suspend", "Reactivate"]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    expect(screen.getByText(/can look but not change/i)).toBeInTheDocument();
  });

  it("a suspended person can be reactivated; a staff account offers no actions at all", async () => {
    mockAccess({ status: "suspended", canSignIn: false, findings: [{ code: "user_suspended", severity: "blocking", title: "This person is suspended", detail: "x", action: "user.reactivate" }] });
    const first = show();
    expect((await screen.findAllByRole("button", { name: "Reactivate" })).length).toBeGreaterThan(0);
    first.unmount();
    role = "platform_admin";
    mockAccess({ findings: [{ code: "platform_account", severity: "info", title: "This is a Fillo staff account", detail: "x" }] });
    show();
    await screen.findByText("This is a Fillo staff account");
    for (const name of ["Unlock login", "Send reset email", "Suspend", "Reactivate"]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });

  it("someone with no login and an expired invitation is offered a resend, not a reset", async () => {
    mockAccess({
      hasLogin: false,
      canSignIn: false,
      invite: { id: "i1", status: "EXPIRED", expiresAt: "2026-01-01T00:00:00Z", createdAt: "2025-12-01T00:00:00Z" },
      findings: [{ code: "invite_expired", severity: "warning", title: "Their invitation expired", detail: "x", action: "invite.resend" }],
    });
    show();
    fireEvent.click((await screen.findAllByRole("button", { name: "Resend invitation" }))[0]!);
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "asked again" } });
    fireEvent.click(screen.getByRole("button", { name: "Resend" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/control/invites/i1/resend", { reason: "asked again" }));
    expect(screen.queryByRole("button", { name: "Send reset email" })).not.toBeInTheDocument();
  });

  it("an API failure says so and shows no person", async () => {
    apiRequest.mockRejectedValue(new ApiError(404, "User not found"));
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("User not found");
    expect(screen.queryByText("Ada Attendant")).not.toBeInTheDocument();
  });
});
