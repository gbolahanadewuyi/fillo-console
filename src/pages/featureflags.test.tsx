/** Feature Flags: every feature the API knows, whether it is built and launched, and which plans include it. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { PlatformRole } from "@/contexts/AuthContext";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
let role: PlatformRole = "platform_owner";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: role } }) }));

import FeatureFlags from "./FeatureFlags";

const plan = (id: string, name: string, featureCodes: string[], isActive = true) => ({ id, name, code: id, price: "1000", billingCycle: "monthly", stationLimit: null, userLimit: null, featureCodes, isActive, companyCount: 1, createdAt: "2026-01-01T00:00:00Z" });
const plans = [plan("p1", "Starter", ["whatsapp"]), plan("p2", "Growth", ["whatsapp", "beta"])];
const inPlans = (key: string) => plans.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive, included: p.featureCodes.includes(key) }));
const catalogue = [
  { key: "whatsapp", label: "WhatsApp Integration", enabledDefault: true, enforcedAt: ["Connecting a WhatsApp number"], gated: false, launched: true, plans: inPlans("whatsapp"), overrides: [] },
  { key: "beta", label: "Beta Thing", enabledDefault: false, enforcedAt: ["Somewhere"], gated: true, launched: false, plans: inPlans("beta"), overrides: [] },
  { key: "live", label: "Live Thing", enabledDefault: false, enforcedAt: ["Elsewhere"], gated: true, launched: true, plans: inPlans("live"), overrides: [] },
  { key: "ai", label: "AI Assistant", enabledDefault: false, enforcedAt: [], gated: true, launched: false, plans: inPlans("ai"), overrides: [] },
];

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><FeatureFlags /></MemoryRouter></QueryClientProvider>);
}
function api() {
  apiRequest.mockImplementation(async (method: string, path: string) => {
    if (method !== "GET") return { ok: true };
    return path.startsWith("/control/plans") ? plans : catalogue;
  });
}
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  apiRequest.mockReset();
  role = "platform_owner";
});

describe("what each feature says about itself", () => {
  it("marks a feature nothing uses, one not launched, one launched, and one in no plan", async () => {
    api();
    show();
    await screen.findByText("Beta Thing");
    expect(screen.getByText("Not available yet")).toBeInTheDocument(); // AI Assistant
    expect(screen.getByText("Not launched")).toBeInTheDocument(); // Beta Thing
    expect(screen.getByText("Launched")).toBeInTheDocument(); // Live Thing
    expect(screen.getAllByText("Not in any plan")).toHaveLength(1); // Live Thing: built, in no plan (AI is not built, so not flagged)
    expect(screen.getByRole("switch", { name: "Beta Thing in Growth" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Beta Thing in Starter" })).not.toBeChecked();
  });
});

describe("adding a feature to a plan", () => {
  it("asks for a reason and sends the plan's features with this one added", async () => {
    api();
    show();
    fireEvent.click(await screen.findByRole("switch", { name: "Beta Thing in Starter" }));
    const confirm = await screen.findByRole("button", { name: "Add to plan" });
    expect(confirm).toBeDisabled();
    type(/reason/i, "Starter customers asked for it");
    fireEvent.click(confirm);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/plans/p1", { featureCodes: ["whatsapp", "beta"], reason: "Starter customers asked for it" }));
  });

  it("removing it sends the plan's features without it", async () => {
    api();
    show();
    fireEvent.click(await screen.findByRole("switch", { name: "Beta Thing in Growth" }));
    type(/reason/i, "pulling it back");
    fireEvent.click(await screen.findByRole("button", { name: "Remove from plan" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/plans/p2", { featureCodes: ["whatsapp"], reason: "pulling it back" }));
  });

  it("a feature that is not built cannot be added to a plan; support cannot change plans at all", async () => {
    api();
    const first = show();
    expect(await screen.findByRole("switch", { name: "AI Assistant in Starter" })).toBeDisabled();
    first.unmount();
    role = "platform_support";
    show();
    expect(await screen.findByRole("switch", { name: "Beta Thing in Starter" })).toBeDisabled();
  });
});

describe("launching", () => {
  it("the owner launches a gated feature with a reason, and sees what it does", async () => {
    api();
    show();
    fireEvent.click(await screen.findByRole("switch", { name: "Launch Beta Thing" }));
    expect(await screen.findByText(/Every company with no plan gets it straight away/)).toBeInTheDocument();
    type(/reason/i, "tested with two companies");
    fireEvent.click(screen.getByRole("button", { name: "Launch" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PUT", "/control/feature-flags/beta/launch", { launched: true, reason: "tested with two companies" }));
  });

  it("taking a launched feature back says what it affects", async () => {
    api();
    show();
    fireEvent.click(await screen.findByRole("switch", { name: "Launch Live Thing" }));
    expect(await screen.findByText(/Companies with no plan lose it straight away/)).toBeInTheDocument();
    type(/reason/i, "found a problem");
    fireEvent.click(screen.getByRole("button", { name: "Take back" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PUT", "/control/feature-flags/live/launch", { launched: false, reason: "found a problem" }));
  });

  it("only the owner sees the launch switch, and only for a gated feature that is built", async () => {
    api();
    const first = show();
    await screen.findByText("Beta Thing");
    expect(screen.queryByRole("switch", { name: "Launch WhatsApp Integration" })).not.toBeInTheDocument(); // not gated
    expect(screen.queryByRole("switch", { name: "Launch AI Assistant" })).not.toBeInTheDocument(); // not built
    first.unmount();
    role = "platform_admin";
    show();
    await screen.findByText("Beta Thing");
    expect(screen.queryByRole("switch", { name: /^Launch / })).not.toBeInTheDocument();
  });
});
