/** Setting a company up: adding a person with a role and station, and creating a role. Both say why, and send exactly what was chosen. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { AddPersonDialog, invitableRoles } from "./AddPersonDialog";
import { NewRoleDialog, groupPermissions } from "./NewRoleDialog";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

const roles = [
  { id: "r-owner", name: "Owner", isSystemRole: true, spendingLimit: null, permissions: [] },
  { id: "r-mgr", name: "Manager", isSystemRole: true, spendingLimit: null, permissions: [] },
  { id: "r-ops", name: "Business Operations Lead", isSystemRole: false, spendingLimit: "10000.00", permissions: [] },
];
const stations = { data: [{ id: "st1", companyId: "c1", name: "Wuse II", status: "active" }], page: 1, pageSize: 50, total: 1, totalPages: 1 };
const permissions = [
  { key: "orders.create", label: "Create orders" },
  { key: "orders.edit", label: "Edit orders" },
  { key: "expenses.approve", label: "Approve expenses" },
];

beforeEach(() => {
  apiRequest.mockReset();
  toast.mockReset();
  apiRequest.mockImplementation(async (method: string, path: string) => {
    if (method === "GET" && path.includes("/roles")) return roles;
    if (method === "GET" && path.startsWith("/control/stations")) return stations;
    if (method === "GET" && path === "/control/permissions") return permissions;
    if (path.endsWith("/people")) return { id: "i1", email: "a@b.com", roleName: "Manager", emailSent: true };
    return { id: "role1" };
  });
});

describe("who can be invited", () => {
  it("anyone but the owner, who is invited when the company is created", () => {
    expect(invitableRoles(roles).map((r) => r.name)).toEqual(["Manager", "Business Operations Lead"]);
  });
});

describe("adding a person", () => {
  it("sends the invitation with the role and the only station, with no reason to give", async () => {
    wrap(<AddPersonDialog companyId="c1" open onOpenChange={() => undefined} />);
    type(await screen.findByLabelText("Name"), "Abbas Musa");
    type(await screen.findByLabelText("Email"), "abbas@example.com");
    fireEvent.click(screen.getByLabelText("Role"));
    fireEvent.click(await screen.findByRole("option", { name: "Manager" }));
    expect(screen.queryByLabelText(/Reason/)).toBeNull();
    const send = screen.getByRole("button", { name: "Send invitation" });
    await waitFor(() => expect(send).toBeEnabled()); // the only station is chosen for them
    fireEvent.click(send);
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith("POST", "/control/companies/c1/people", { name: "Abbas Musa", email: "abbas@example.com", roleId: "r-mgr", stationId: "st1" }),
    );
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Invitation sent" }));
  });

  it("does not offer the Owner role, and cannot be sent without a name, a valid email and a role", async () => {
    wrap(<AddPersonDialog companyId="c1" open onOpenChange={() => undefined} />);
    const send = await screen.findByRole("button", { name: "Send invitation" });
    expect(send).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Role"));
    const list = await screen.findByRole("listbox");
    expect(within(list).queryByRole("option", { name: "Owner" })).toBeNull();
    expect(within(list).getByRole("option", { name: "Business Operations Lead" })).toBeInTheDocument();
    fireEvent.click(within(list).getByRole("option", { name: "Manager" }));
    type(screen.getByLabelText("Email"), "not-an-email");
    expect(send).toBeDisabled();
    type(screen.getByLabelText("Email"), "ok@example.com");
    expect(send).toBeDisabled(); // a name is needed too
    type(screen.getByLabelText("Name"), "Ok Person");
    await waitFor(() => expect(send).toBeEnabled());
  });
});

describe("permissions in a role", () => {
  it("are grouped by area", () => {
    expect(groupPermissions(permissions).map(([area, items]) => [area, items.length])).toEqual([["expenses", 1], ["orders", 2]]);
  });
});

describe("creating a role", () => {
  it("needs a name and at least one permission, then sends them with the limit", async () => {
    wrap(<NewRoleDialog companyId="c1" open onOpenChange={() => undefined} />);
    const create = await screen.findByRole("button", { name: "Create role" });
    expect(create).toBeDisabled();
    type(screen.getByLabelText("Name"), "Business Operations Lead");
    type(screen.getByLabelText(/Expense approval limit/), "10000");
    type(screen.getByLabelText(/Daily spending allowance/), "50000");
    expect(create).toBeDisabled(); // no permission yet
    fireEvent.click(await screen.findByRole("checkbox", { name: "Approve expenses" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Edit orders" }));
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.click(create);
    await waitFor(() => {
      const call = apiRequest.mock.calls.find((c) => c[0] === "POST");
      expect(call?.[1]).toBe("/control/companies/c1/roles");
      expect(call?.[2]).toMatchObject({ name: "Business Operations Lead", spendingLimit: "10000.00", dailySpendingLimit: "50000.00" });
      expect([...(call?.[2] as { permissions: string[] }).permissions].sort()).toEqual(["expenses.approve", "orders.edit"]);
    });
  });
});
