/** Invitations: resending just happens, revoking asks "are you sure" without a reason, and editing opens the form. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: "platform_support" } }) }));
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { InvitesPanel } from "./InvitesPanel";

const row = { id: "i1", email: "ngozi@example.com", name: "Ngozi Eze", isOwner: false, companyId: "c1", companyName: "SEE Gas", roleId: "r1", roleName: "Cashier", stationId: "st1", stationName: "Wuse II", status: "pending", expiresAt: "2026-12-01T00:00:00Z", createdAt: "2026-11-01T00:00:00Z" };
const show = () => render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><InvitesPanel companyId="c1" /></QueryClientProvider></MemoryRouter>);

beforeEach(() => {
  apiRequest.mockReset();
  toast.mockReset();
  apiRequest.mockImplementation(async (method: string, path: string) => {
    if (method === "GET" && path.startsWith("/control/invites")) return { data: [row], page: 1, pageSize: 20, total: 1, totalPages: 1 };
    if (method === "GET") return [];
    return { ok: true, emailSent: true };
  });
});

describe("invitations", () => {
  it("resend just happens: no prompt, no reason", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Resend" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/control/invites/i1/resend", {}));
    expect(screen.queryByLabelText(/reason/i)).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Invitation sent again" }));
  });

  it("revoke asks are-you-sure, with no reason to type", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Revoke" }));
    expect(await screen.findByText(/cannot be sent again/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/reason/i)).toBeNull();
    expect(apiRequest).not.toHaveBeenCalledWith("POST", "/control/invites/i1/revoke", expect.anything());
    fireEvent.click(screen.getAllByRole("button", { name: "Revoke" }).at(-1)!);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/control/invites/i1/revoke", {}));
  });

  it("edit opens the form with what the invitation holds", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(await screen.findByLabelText("Name")).toHaveValue("Ngozi Eze");
    expect(screen.getByLabelText("Email")).toHaveValue("ngozi@example.com");
  });
});
