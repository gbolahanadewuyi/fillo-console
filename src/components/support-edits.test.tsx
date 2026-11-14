/** Correcting what staff set up: an invitation, a station and the owner. Each sends only what changed; none asks for a reason except changing an owner's sign-in email. The test-only controls stay out of production. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { EditInviteDialog } from "./EditInviteDialog";
import { EditStationDialog } from "./EditStationDialog";
import { EditOwnerDialog } from "./EditOwnerDialog";
import type { ControlInvite, ControlStation, ControlUser } from "@/hooks/useControlApi";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const REASON = "Owner asked to use their company email";

const roles = [
  { id: "r-owner", name: "Owner", isSystemRole: true, spendingLimit: null, permissions: [] },
  { id: "r-cashier", name: "Cashier", isSystemRole: false, spendingLimit: null, permissions: [] },
];
const stations = { data: [{ id: "st1", companyId: "c1", name: "Wuse II", status: "active" }, { id: "st2", companyId: "c1", name: "Garki", status: "active" }], page: 1, pageSize: 50, total: 2, totalPages: 1 };

const invite = (over: Partial<ControlInvite> = {}): ControlInvite => ({ id: "i1", email: "old@example.com", name: "Old Name", isOwner: false, companyId: "c1", companyName: "SEE Gas", roleId: "r-cashier", roleName: "Cashier", stationId: "st1", stationName: "Wuse II", status: "pending", expiresAt: "2026-12-01T00:00:00Z", createdAt: "2026-11-01T00:00:00Z", ...over });

beforeEach(() => {
  apiRequest.mockReset();
  toast.mockReset();
  apiRequest.mockImplementation(async (method: string, path: string) => {
    if (method === "GET" && path.includes("/roles")) return roles;
    if (method === "GET" && path.startsWith("/control/stations")) return stations;
    if (method === "PATCH" && path.startsWith("/control/invites")) return { ok: true, emailSent: true };
    if (method === "PATCH" && path.endsWith("/owner")) return { id: "u1", name: "Idris Akanbi", email: "idris@example.com", phone: null, emailChanged: true };
    return { id: "x", name: "ok" };
  });
});

describe("editing an invitation", () => {
  it("sends only what changed, asks for no reason, and resends by default", async () => {
    wrap(<EditInviteDialog invite={invite()} open onOpenChange={() => undefined} />);
    expect(screen.queryByLabelText(/Reason/)).toBeNull();
    const save = screen.getByRole("button", { name: "Save and resend" });
    type(screen.getByLabelText("Name"), "Idris Akanbi");
    type(screen.getByLabelText("Email"), "idris@example.com");
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/invites/i1", { name: "Idris Akanbi", email: "idris@example.com", resend: true }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Invitation corrected and sent" }));
  });

  it("can save without sending", async () => {
    wrap(<EditInviteDialog invite={invite()} open onOpenChange={() => undefined} />);
    type(screen.getByLabelText("Name"), "Fixed Name");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/invites/i1", { name: "Fixed Name", resend: false }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Invitation saved" }));
  });

  it("does not offer a role or station for the owner's invitation, and refuses an invalid email", () => {
    wrap(<EditInviteDialog invite={invite({ isOwner: true, roleId: "r-owner", stationId: null })} open onOpenChange={() => undefined} />);
    expect(screen.queryByLabelText("Role")).toBeNull();
    expect(screen.queryByLabelText("Station")).toBeNull();
    type(screen.getByLabelText("Email"), "not-an-email");
    expect(screen.getByRole("button", { name: "Save and resend" })).toBeDisabled();
  });

  it("shows the API's message when the change is refused", async () => {
    apiRequest.mockImplementation(async (method: string, path: string) => {
      if (method === "GET") return path.includes("/roles") ? roles : stations;
      throw new Error("Someone with this email already has an account");
    });
    wrap(<EditInviteDialog invite={invite()} open onOpenChange={() => undefined} />);
    type(screen.getByLabelText("Email"), "taken@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Save and resend" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already has an account");
  });
});

describe("editing a station", () => {
  const station: ControlStation = { id: "st1", companyId: "c1", name: "Wuse II", address: "1 Old Road", phone: null, status: "active", createdAt: "2026-11-01T00:00:00Z" };

  it("needs a change, asks for no reason, then sends only the changed fields", async () => {
    wrap(<EditStationDialog station={station} open onOpenChange={() => undefined} />);
    const save = screen.getByRole("button", { name: "Save" });
    expect(screen.queryByLabelText(/Reason/)).toBeNull();
    expect(save).toBeDisabled(); // nothing changed
    type(screen.getByLabelText("Address"), "Plot 5, Utako");
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/companies/c1/stations/st1", { address: "Plot 5, Utako" }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Station updated" }));
  });
});

describe("editing the owner", () => {
  const owner: ControlUser = { id: "u1", name: "Owner Typo", email: "old@example.com", phone: null, isOwner: true, companyId: "c1", roleName: "Owner", status: "active", createdAt: "2026-11-01T00:00:00Z" };

  it("a name or phone correction needs no reason", async () => {
    wrap(<EditOwnerDialog owner={owner} open onOpenChange={() => undefined} />);
    expect(screen.queryByLabelText(/Reason/)).toBeNull();
    type(screen.getByLabelText("Name"), "Idris Akanbi");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/companies/c1/owner", { name: "Idris Akanbi" }));
  });

  it("warns that changing the email signs them out and asks why, then sends the changes with the reason", async () => {
    wrap(<EditOwnerDialog owner={owner} open onOpenChange={() => undefined} />);
    expect(screen.queryByText(/signs Owner Typo out/)).toBeNull();
    type(screen.getByLabelText("Sign-in email"), "idris@example.com");
    expect(screen.getByText(/signs Owner Typo out on every device/)).toBeInTheDocument();
    type(screen.getByLabelText("Name"), "Idris Akanbi");
    type(screen.getByLabelText("Phone"), "0803 000 9999");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled(); // an email change says why
    type(screen.getByLabelText(/Reason/), REASON);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/companies/c1/owner", { name: "Idris Akanbi", phone: "0803 000 9999", email: "idris@example.com", reason: REASON }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Owner updated", description: expect.stringContaining("signed out") }));
  });
});

describe("test-only controls", () => {
  it("are available in development and staging, and not in a production build", async () => {
    vi.resetModules();
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_SHOW_DEMO_ACCOUNTS", "");
    expect((await import("@/lib/environment")).isTestEnvironment).toBe(true);
    vi.resetModules();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_SHOW_DEMO_ACCOUNTS", "true");
    expect((await import("@/lib/environment")).isTestEnvironment).toBe(true); // staging
    vi.resetModules();
    vi.stubEnv("VITE_SHOW_DEMO_ACCOUNTS", "");
    expect((await import("@/lib/environment")).isTestEnvironment).toBe(false); // production
    vi.unstubAllEnvs();
  });
});
