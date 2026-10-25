/** The console shows what the API says, or says it could not load it: never made-up data. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/services/api";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, apiRequest };
});
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: "platform_owner" } }) }));
vi.mock("recharts", () => ({
  AreaChart: () => null, Area: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import Companies from "./Companies";
import Dashboard from "./Dashboard";
import Stations from "./Stations";
import Users from "./Users";
import AuditLogs from "./AuditLogs";
import Integrations from "./Integrations";
import FeatureFlags from "./FeatureFlags";
import Plans from "./Plans";

function show(page: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiRequest.mockReset();
});

describe("when the API fails, the pages say so and show no invented data", () => {
  const pages: [string, React.ReactElement][] = [
    ["Companies", <Companies />],
    ["Dashboard", <Dashboard />],
    ["Stations", <Stations />],
    ["Users", <Users />],
    ["Audit Logs", <AuditLogs />],
    ["Integrations", <Integrations />],
    ["Feature Flags", <FeatureFlags />],
    ["Plans", <Plans />],
  ];
  for (const [name, page] of pages) {
    it(`${name}`, async () => {
      apiRequest.mockImplementation(() => Promise.reject(new ApiError(500, "The server is down")));
      show(page);
      const alerts = await screen.findAllByRole("alert");
      expect(alerts[0]).toHaveTextContent(/couldn't load/i);
      expect(alerts[0]).toHaveTextContent("The server is down");
      // the old mock tenants must never appear
      for (const fake of ["Seegas", "Nord Energy", "AquaGas", "Amina Bello"]) expect(screen.queryByText(fake)).not.toBeInTheDocument();
    });
  }
});

describe("what the API returns is what is shown", () => {
  it("lists the real companies", async () => {
    apiRequest.mockResolvedValue({
      data: [{ id: "c1", name: "Real Gas Ltd", status: "active", subscriptionStatus: "ACTIVE", stationCount: 2, userCount: 7, createdAt: "2026-01-01T00:00:00Z" }],
      page: 1, pageSize: 20, total: 1, totalPages: 1,
    });
    show(<Companies />);
    expect(await screen.findByText("Real Gas Ltd")).toBeInTheDocument();
  });

  const stats = { totalCompanies: 1, activeCompanies: 1, trialCompanies: 0, suspendedCompanies: 0, totalStations: 1, totalUsers: 1, activeUsers: 1, ordersToday: 3, paymentsToday: "2500", paymentsByDay: [{ date: "2030-01-15", payments: 1000 }, { date: "2030-01-16", payments: 2500 }], activeIntegrations: 2, failedIntegrations: 1 };
  const dashboardApi = (attention: unknown[]) =>
    apiRequest.mockImplementation(async (_m: string, path: string) => {
      if (path.startsWith("/control/stats")) return stats;
      if (path.startsWith("/control/attention")) return { data: attention };
      return { data: [], page: 1, pageSize: 8, total: 0, totalPages: 1 };
    });

  it("the dashboard lists what needs attention, with the reason, and links the company", async () => {
    dashboardApi([
      { id: "integration:w1", severity: "critical", kind: "integration", title: "whatsapp for Real Gas Ltd is failing", detail: "Meta answered 401", companyId: "c1" },
      { id: "job:notify-sweep", severity: "warning", kind: "job", title: "notify-sweep has stopped running", detail: "It should run every 5 minutes." },
    ]);
    show(<Dashboard />);
    expect(await screen.findByText("whatsapp for Real Gas Ltd is failing")).toBeInTheDocument();
    expect(screen.getByText("Meta answered 401")).toBeInTheDocument();
    expect(screen.getByText("notify-sweep has stopped running")).toBeInTheDocument();
    expect(screen.getByText("Something is failing")).toBeInTheDocument();
    expect(screen.getByText("whatsapp for Real Gas Ltd is failing").closest("a")).toHaveAttribute("href", "/companies/c1");
  });

  it("an empty attention list says nothing is flagged, and counts zero", async () => {
    dashboardApi([]);
    show(<Dashboard />);
    expect(await screen.findByText("Nothing is flagged.")).toBeInTheDocument();
    expect(screen.queryByText("Something is failing")).not.toBeInTheDocument();
  });

  it("the dashboard answers three questions in order: what needs me, how is business, is the platform healthy", async () => {
    dashboardApi([]);
    show(<Dashboard />);
    await screen.findByText("Nothing is flagged.");
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Needs attention", "Business", "Platform health"]);
  });

  it("business numbers say what they count, in naira and Lagos days", async () => {
    dashboardApi([]);
    show(<Dashboard />);
    expect(await screen.findByText("Created since midnight in Lagos")).toBeInTheDocument();
    expect(screen.getByText("Recorded since midnight in Lagos")).toBeInTheDocument();
    expect(screen.getByText(/2,500/)).toBeInTheDocument(); // payments today
    expect(screen.getByText(/Payments recorded, last 14 days: .*3,500/)).toBeInTheDocument(); // 1,000 + 2,500
    expect(screen.getByText("Integrations: 2 connected, 1 failing")).toBeInTheDocument();
  });

  it("a failed attention request says so instead of claiming all is well", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) => {
      if (path.startsWith("/control/stats")) return stats;
      if (path.startsWith("/control/attention")) throw new ApiError(500, "attention is down");
      return { data: [], page: 1, pageSize: 8, total: 0, totalPages: 1 };
    });
    show(<Dashboard />);
    expect(await screen.findByText(/couldn't load the attention list/i)).toBeInTheDocument();
    expect(screen.queryByText("Nothing is flagged.")).not.toBeInTheDocument();
  });

  it("shows the reason a person gave next to their change in the audit trail", async () => {
    apiRequest.mockResolvedValue({
      data: [{ id: "a1", actorId: "u1", actorName: "Fillo Admin", action: "company.suspended", resourceType: "Company", resourceId: "c1", resourceLabel: "Real Gas Ltd", companyId: "c1", companyName: "Real Gas Ltd", reason: "unpaid invoice", createdAt: "2026-10-24T10:00:00Z" }],
      page: 1, pageSize: 20, total: 1, totalPages: 1,
    });
    show(<AuditLogs />);
    expect(await screen.findByText("unpaid invoice")).toBeInTheDocument();
    expect(screen.getByText("Fillo Admin")).toBeInTheDocument();
  });

  it("shows an integration's real problem next to it", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) =>
      path.startsWith("/control/jobs")
        ? { jobs: [], recentFailures: [], outbox: { pending: 0, stuck: 0, oldestAt: null, lastError: null } }
        : [{ id: "i1", companyId: "c1", companyName: "Real Gas Ltd", provider: "whatsapp", status: "error", lastFailureAt: "2026-10-24T09:00:00Z", lastFailureDetail: "Meta answered 401" }],
    );
    show(<Integrations />);
    expect(await screen.findByText("Error")).toBeInTheDocument();
    expect(screen.getByText(/Meta answered 401/)).toBeInTheDocument();
  });

  it("shows an unknown integration as unknown, not healthy", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) =>
      path.startsWith("/control/jobs")
        ? { jobs: [], recentFailures: [], outbox: { pending: 0, stuck: 0, oldestAt: null, lastError: null } }
        : [{ id: "i1", companyId: "c1", companyName: "Real Gas Ltd", provider: "whatsapp", status: "unknown" }],
    );
    show(<Integrations />);
    expect(await screen.findByText("Unknown")).toBeInTheDocument();
    expect(screen.queryByText("Healthy")).not.toBeInTheDocument();
  });
});
