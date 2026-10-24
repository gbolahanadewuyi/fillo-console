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

  it("does not claim zero failing integrations when failures are not tracked", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) => {
      if (path.startsWith("/control/stats"))
        return { totalCompanies: 1, activeCompanies: 1, trialCompanies: 0, suspendedCompanies: 0, totalStations: 1, activeStations: 1, totalUsers: 1, activeUsers: 1, ordersToday: 0, revenueToday: "0", revenue30d: [], activeIntegrations: 1, failedIntegrations: null };
      return { data: [], page: 1, pageSize: 8, total: 0, totalPages: 1 };
    });
    show(<Dashboard />);
    expect(await screen.findByText("Failures are not tracked yet")).toBeInTheDocument();
    expect(screen.queryByText("0 failing")).not.toBeInTheDocument();
  });

  it("shows an unknown integration as unknown, not healthy", async () => {
    apiRequest.mockResolvedValue([{ id: "i1", companyId: "c1", companyName: "Real Gas Ltd", provider: "whatsapp", status: "unknown" }]);
    show(<Integrations />);
    expect(await screen.findByText("Unknown")).toBeInTheDocument();
    expect(screen.queryByText("Healthy")).not.toBeInTheDocument();
  });
});
