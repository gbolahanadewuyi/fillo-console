import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { PlatformRole } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
let role: PlatformRole = "platform_finance";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: role } }) }));

import Plans from "./Plans";
import { BillingPanel } from "@/components/BillingPanel";

const plans = [
  { id: "p1", code: "starter", name: "Starter", price: "15000", billingCycle: "monthly", stationLimit: 1, userLimit: 5, featureCodes: ["advanced_reports"], isActive: true, companyCount: 2, createdAt: "2026-01-01T00:00:00Z" },
  { id: "p2", code: "growth", name: "Growth", price: "35000", billingCycle: "monthly", stationLimit: 3, userLimit: null, featureCodes: ["whatsapp"], isActive: true, companyCount: 0, createdAt: "2026-01-01T00:00:00Z" },
  { id: "p3", code: "old", name: "Legacy", price: "9000", billingCycle: "monthly", stationLimit: null, userLimit: null, featureCodes: [], isActive: false, companyCount: 1, createdAt: "2026-01-01T00:00:00Z" },
];
const catalogue = [
  { key: "whatsapp", label: "WhatsApp Integration", enabledDefault: true, enforcedAt: ["Connecting a WhatsApp number"], overrides: [] },
  { key: "advanced_reports", label: "Advanced Reports", enabledDefault: true, enforcedAt: [], overrides: [] },
];
const billing = (over: object = {}) => ({
  subscriptionStatus: "TRIALING",
  trialEndsAt: "2026-11-01T00:00:00Z",
  plan: { id: "p1", code: "starter", name: "Starter" },
  usage: { stations: { used: 1, limit: 1 }, users: { used: 3, limit: 5 } },
  features: [
    { key: "whatsapp", label: "WhatsApp Integration", enabled: false, source: "plan", enforced: true },
    { key: "advanced_reports", label: "Advanced Reports", enabled: true, source: "plan", enforced: false },
  ],
  billing: { provider: "bachs", customerId: "cus_123", subscriptionId: "sub_456" },
  ...over,
});

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}
function api(b: object = billing()) {
  apiRequest.mockImplementation(async (method: string, path: string) => {
    if (method !== "GET") return b;
    if (path.startsWith("/control/plans")) return plans;
    if (path.startsWith("/control/feature-flags")) return catalogue;
    if (path.includes("/billing")) return b;
    return {};
  });
}
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const posts = (method: string) => apiRequest.mock.calls.filter(([m]) => m === method);

beforeEach(() => {
  apiRequest.mockReset();
  role = "platform_finance";
});

describe("a company's billing", () => {
  it("shows the plan, what is used against its limits, and what each feature depends on", async () => {
    api();
    wrap(<BillingPanel companyId="c1" companyName="Real Gas" />);
    expect(await screen.findByText("1 of 1")).toBeInTheDocument();
    expect(screen.getByText("3 of 5")).toBeInTheDocument();
    expect(screen.getAllByText(/From the plan/)).toHaveLength(2);
    expect(screen.getByText(/not used by the apps yet/)).toBeInTheDocument(); // Advanced Reports
    expect(screen.getByText("cus_123")).toBeInTheDocument();
  });

  it("a company with no plan says it is unrestricted", async () => {
    api(billing({ plan: null, usage: { stations: { used: 2, limit: null }, users: { used: 4, limit: null } }, features: [{ key: "whatsapp", label: "WhatsApp Integration", enabled: true, source: "unrestricted", enforced: true }] }));
    wrap(<BillingPanel companyId="c1" companyName="Real Gas" />);
    expect(await screen.findByText("2 (no limit)")).toBeInTheDocument();
    expect(screen.getByText(/No plan: unrestricted/)).toBeInTheDocument();
  });

  it("changing the plan asks for a reason and sends the plan and the reason", async () => {
    api();
    wrap(<BillingPanel companyId="c1" companyName="Real Gas" />);
    await screen.findByText("1 of 1");
    const change = screen.getByRole("button", { name: "Change" });
    expect(change).toBeDisabled(); // nothing chosen yet
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Plan" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Growth" }));
    fireEvent.click(await screen.findByRole("button", { name: "Change" }));
    expect(await screen.findByRole("button", { name: "Change plan" })).toBeDisabled();
    type(/reason/i, "  upgraded on a call  ");
    fireEvent.click(screen.getByRole("button", { name: "Change plan" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PUT", "/control/companies/c1/plan", { planId: "p2", reason: "upgraded on a call" }));
  });

  it("a plan that is no longer offered cannot be chosen (unless the company is already on it)", async () => {
    api();
    const first = wrap(<BillingPanel companyId="c1" companyName="Real Gas" />);
    await screen.findByText("1 of 1");
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Plan" }), { key: "ArrowDown" });
    const names = (await screen.findAllByRole("option")).map((o) => o.textContent);
    expect(names).toEqual(["No plan (unrestricted)", "Starter", "Growth"]);
    first.unmount();
    api(billing({ plan: { id: "p3", code: "old", name: "Legacy" } }));
    wrap(<BillingPanel companyId="c1" companyName="Real Gas" />);
    await screen.findAllByText("Legacy");
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Plan" }), { key: "ArrowDown" });
    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toContain("Legacy");
  });

  it("extending a trial needs days between 1 and 90 and a reason", async () => {
    api();
    wrap(<BillingPanel companyId="c1" companyName="Real Gas" />);
    fireEvent.click(await screen.findByRole("button", { name: "Extend trial" }));
    type("Days to add", "120");
    type(/reason/i, "agreed with them");
    fireEvent.click(screen.getByRole("button", { name: "Extend trial", hidden: false }));
    expect(await screen.findByText("At most 90 days at a time")).toBeInTheDocument();
    expect(posts("POST")).toHaveLength(0);
    type("Days to add", "14");
    fireEvent.click(screen.getByRole("button", { name: "Extend trial" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/control/companies/c1/trial", { days: 14, reason: "agreed with them" }));
  });

  it("no Extend trial for a company that is not on a trial", async () => {
    api(billing({ subscriptionStatus: "ACTIVE" }));
    wrap(<BillingPanel companyId="c1" companyName="Real Gas" />);
    await screen.findByText("1 of 1");
    expect(screen.queryByRole("button", { name: "Extend trial" })).not.toBeInTheDocument();
  });

  it("support sees the plan but no controls and no provider ids", async () => {
    role = "platform_support";
    api(billing({ billing: null }));
    wrap(<BillingPanel companyId="c1" companyName="Real Gas" />);
    expect(await screen.findByText("Starter")).toBeInTheDocument();
    for (const name of ["Change", "Extend trial"]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    expect(screen.queryByText("cus_123")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Turn .* on/ })).not.toBeInTheDocument();
  });

  it("only the owner can override a feature or remove the override, each with a reason", async () => {
    role = "platform_finance";
    api(billing({ features: [{ key: "whatsapp", label: "WhatsApp Integration", enabled: true, source: "override", enforced: true }] }));
    const first = wrap(<BillingPanel companyId="c1" companyName="Real Gas" />);
    await screen.findByText("Set for this company");
    expect(screen.queryByRole("button", { name: /Turn WhatsApp/ })).not.toBeInTheDocument();
    first.unmount();

    role = "platform_owner";
    wrap(<BillingPanel companyId="c1" companyName="Real Gas" />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove the WhatsApp Integration override" }));
    type(/reason/i, "back to the plan");
    fireEvent.click(screen.getByRole("button", { name: "Remove override", hidden: false }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PUT", "/control/feature-flags/whatsapp", { enabled: null, scopeType: "company", scopeId: "c1", reason: "back to the plan" }));
  });

  it("a failed API says so instead of showing a plan", async () => {
    apiRequest.mockRejectedValue(new ApiError(500, "db is down"));
    wrap(<BillingPanel companyId="c1" companyName="Real Gas" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("db is down");
  });
});

describe("plans", () => {
  it("lists the real plans with limits, features and how many companies are on each", async () => {
    api();
    wrap(<Plans />);
    expect(await screen.findByText("Starter")).toBeInTheDocument();
    expect(screen.getAllByText("No limit").length).toBeGreaterThan(0);
    expect(screen.getByText(/not offered/)).toBeInTheDocument();
  });

  it("finance can edit, support cannot", async () => {
    api();
    const first = wrap(<Plans />);
    expect(await screen.findByRole("button", { name: "Edit Starter" })).toBeInTheDocument();
    first.unmount();
    role = "platform_support";
    wrap(<Plans />);
    await screen.findByText("Starter");
    expect(screen.queryByRole("button", { name: /^Edit / })).not.toBeInTheDocument();
  });

  it("saving sends only what changed, with the reason; nothing changed means nothing to save", async () => {
    api();
    wrap(<Plans />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit Starter" }));
    const save = await screen.findByRole("button", { name: "Save plan" });
    expect(save).toBeDisabled();
    type("Price (₦ a month)", "16000");
    type("People limit", "");
    fireEvent.click(screen.getByRole("checkbox", { name: "WhatsApp Integration" }));
    type(/reason/i, "price review");
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/plans/p1", { price: "16000", userLimit: null, featureCodes: ["advanced_reports", "whatsapp"], reason: "price review" }),
    );
  });

  it("refuses a bad price or limit and a missing reason next to the field", async () => {
    api();
    wrap(<Plans />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit Starter" }));
    type("Price (₦ a month)", "abc");
    type("Station limit", "0");
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("An amount like 15000 or 15000.50")).toBeInTheDocument();
    expect(within(dialog).getByText("A whole number, or leave empty for no limit")).toBeInTheDocument();
    expect(within(dialog).getByText(/Give a reason of at least 5 characters/)).toBeInTheDocument();
    expect(posts("PATCH")).toHaveLength(0);
  });

  it("an API refusal keeps the dialog open and says why", async () => {
    apiRequest.mockImplementation(async (method: string, path: string) => {
      if (method === "PATCH") throw new ApiError(400, "Unknown feature: teleport");
      return path.startsWith("/control/feature-flags") ? catalogue : plans;
    });
    wrap(<Plans />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit Starter" }));
    type("Price (₦ a month)", "16000");
    type(/reason/i, "price review");
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unknown feature: teleport");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
