/** The dashboard: what needs a person, how the platform is, who uses Fillo and how much, for customers only. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/services/api";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
vi.mock("recharts", () => ({
  BarChart: ({ data }: { data: unknown[] }) => <div data-testid="bars">{data.length} bars</div>,
  Bar: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import Dashboard from "./Dashboard";

const days = (orders: number, payments: number) => Array.from({ length: 14 }, (_, i) => ({ date: `2030-01-${String(i + 3).padStart(2, "0")}`, orders: i === 13 ? orders : 0, payments: i === 13 ? payments : 0 }));
const overview = (over: Record<string, unknown> = {}) => ({
  organisations: { total: 3, active: 2, trialing: 1, pastDue: 0, suspended: 0, stations: 4, users: 14, testExcluded: 1 },
  adoption: { active7d: 2, newThisWeek: 1, newLastWeek: 0, atRisk: 1 },
  usage: { days: days(5, 12000), orders7d: 5, ordersPrev7d: 3, payments7d: 12000, paymentsPrev7d: 12000, whatsappOrders7d: 2 },
  platform: { api: "ok", database: "ok", jobs: { total: 6, failing: 0, stale: 0 }, integrations: { total: 2, failing: 0, unknown: 0 }, outbox: { stuck: 0 } },
  ...over,
});

function api(ov: object = overview(), attention: unknown[] = []) {
  apiRequest.mockImplementation(async (_m: string, path: string) => {
    if (path.startsWith("/control/overview")) return ov;
    if (path.startsWith("/control/attention")) return { data: attention };
    return { data: [], page: 1, pageSize: 8, total: 0, totalPages: 1 };
  });
}
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><Dashboard /></MemoryRouter></QueryClientProvider>);
}
const calls = (prefix: string) => apiRequest.mock.calls.filter(([, path]) => String(path).startsWith(prefix)).map(([, path]) => String(path));

beforeEach(() => {
  apiRequest.mockReset();
});

describe("requires attention", () => {
  it("lists what a person should look at, each line a link to where it is dealt with", async () => {
    api(overview(), [
      { id: "company:c1", severity: "critical", kind: "company_suspended", title: "Real Gas Ltd is suspended", detail: "unpaid", companyId: "c1" },
      { id: "cases:open", severity: "warning", kind: "support_cases", title: "2 open support cases", detail: "The oldest has been open 1 day." },
      { id: "pos:c1", severity: "warning", kind: "pos_unmatched", title: "Real Gas Ltd has 2 payments not matched to an order", detail: "₦5,000", companyId: "c1" },
      { id: "trial:c2", severity: "warning", kind: "trial_ending", title: "Other Gas's trial ends in 3 days", detail: "x", companyId: "c2" },
      { id: "integration:w1", severity: "critical", kind: "integration", title: "whatsapp for Real Gas Ltd is failing", detail: "Meta answered 401", companyId: "c1" },
    ]);
    show();
    expect((await screen.findByText("Real Gas Ltd is suspended")).closest("a")).toHaveAttribute("href", "/companies/c1");
    expect(screen.getByText("2 open support cases").closest("a")).toHaveAttribute("href", "/cases");
    expect(screen.getByText(/not matched to an order/).closest("a")).toHaveAttribute("href", "/payments?companyId=c1&matched=no&status=SUCCESSFUL");
    expect(screen.getByText(/trial ends in 3 days/).closest("a")).toHaveAttribute("href", "/companies/c2");
    expect(screen.getByText("whatsapp for Real Gas Ltd is failing")).toBeInTheDocument(); // a customer's broken integration is a customer problem
  });

  it("platform-only problems are not in the list; they have their own page", async () => {
    api(overview(), [{ id: "job:x", severity: "warning", kind: "job", title: "notify-sweep has stopped running", detail: "It should run every 5 minutes." }]);
    show();
    expect(await screen.findByText("Nothing needs you.")).toBeInTheDocument();
    expect(screen.queryByText(/notify-sweep/)).not.toBeInTheDocument();
  });

  it("a failed request says so instead of claiming all is well", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) => {
      if (path.startsWith("/control/attention")) throw new ApiError(500, "attention is down");
      return overview();
    });
    show();
    expect(await screen.findByText(/couldn't load the attention list/i)).toBeInTheDocument();
    expect(screen.queryByText("Nothing needs you.")).not.toBeInTheDocument();
  });
});

describe("platform health", () => {
  it("shows each check with its real state and links to the detail", async () => {
    api(overview({ platform: { api: "ok", database: "ok", jobs: { total: 6, failing: 1, stale: 0 }, integrations: { total: 3, failing: 1, unknown: 1 }, outbox: { stuck: 4 } } }));
    show();
    const section = (await screen.findByRole("heading", { name: "Platform health" })).closest("section")!;
    expect(within(section).getByText("Responding")).toBeInTheDocument();
    expect(within(section).getByText("1 failing")).toBeInTheDocument();
    expect(within(section).getByText("1 of 3 failing")).toBeInTheDocument();
    expect(within(section).getByText("4 waiting over 15 minutes")).toBeInTheDocument();
    expect(within(section).getByText("1 of 3 failing").closest("a")).toHaveAttribute("href", "/integrations");
  });

  it("says all is working only when it is, and says when an integration has no recent activity", async () => {
    api(overview({ platform: { api: "ok", database: "ok", jobs: { total: 6, failing: 0, stale: 0 }, integrations: { total: 2, failing: 0, unknown: 2 }, outbox: { stuck: 0 } } }));
    show();
    expect(await screen.findByText("All 6 running")).toBeInTheDocument();
    expect(screen.getByText("2 of 2 with no recent activity")).toBeInTheDocument();
    expect(screen.queryByText(/All 2 working/)).not.toBeInTheDocument();
  });
});

describe("adoption and usage", () => {
  it("separates registered organisations from those actually using Fillo, and each part links to the filtered list", async () => {
    api();
    show();
    expect(await screen.findByText("2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Placed an order in the last 7 days")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1 on trial" })).toHaveAttribute("href", "/companies?status=trial");
    expect(screen.getByRole("link", { name: "0 suspended" })).toHaveAttribute("href", "/companies?status=suspended");
    expect(screen.getByRole("link", { name: "4 stations" })).toHaveAttribute("href", "/stations");
  });

  it("usage says what it counts: companies' own records, not Fillo's revenue, against the 7 days before", async () => {
    api();
    show();
    expect(await screen.findByText(/not Fillo's revenue/)).toBeInTheDocument();
    expect(screen.getByText(/\+2 on the 7 days before/)).toBeInTheDocument();
    expect(screen.getByText(/same as the 7 days before/)).toBeInTheDocument();
    expect(screen.getByText(/orders came through WhatsApp/)).toBeInTheDocument();
    expect(screen.getByTestId("bars")).toHaveTextContent("14 bars");
  });

  it("with nothing in 14 days it says so instead of drawing an empty chart", async () => {
    api(overview({ usage: { days: days(0, 0), orders7d: 0, ordersPrev7d: 0, payments7d: 0, paymentsPrev7d: 0, whatsappOrders7d: 0 } }));
    show();
    expect(await screen.findByText("No orders or payments in the last 14 days.")).toBeInTheDocument();
    expect(screen.queryByTestId("bars")).not.toBeInTheDocument();
  });

  it("an overview that cannot load says so and shows no numbers", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) => {
      if (path.startsWith("/control/overview")) throw new ApiError(500, "overview is down");
      return { data: [] };
    });
    show();
    expect(await screen.findByText(/couldn't load the overview/i)).toBeInTheDocument();
    expect(screen.queryByText("Adoption")).not.toBeInTheDocument();
  });
});

describe("test companies", () => {
  it("are left out by default, with a note of how many are hidden, and included only when asked", async () => {
    api();
    show();
    expect(await screen.findByText("(1 hidden)")).toBeInTheDocument();
    expect(calls("/control/overview")).toEqual(["/control/overview?includeTest=false"]);
    fireEvent.click(screen.getByRole("switch", { name: "Include test companies" }));
    await waitFor(() => expect(calls("/control/overview")).toContain("/control/overview?includeTest=true"));
    expect(calls("/control/attention")).toContain("/control/attention?includeTest=true");
  });
});
