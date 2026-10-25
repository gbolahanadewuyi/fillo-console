import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: "platform_support" } }) }));

import Companies from "./Companies";
import Payments from "./Payments";
import Users from "./Users";
import CompanyDetail from "./CompanyDetail";
import { IntegrationsTable } from "@/components/IntegrationsTable";

const where = { current: "" };
function Where() {
  where.current = useLocation().pathname + useLocation().search;
  return null;
}
function show(path: string, routes: [string, React.ReactElement][]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Where />
        <Routes>{routes.map(([p, el]) => <Route key={p} path={p} element={el} />)}</Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const page = (data: unknown[]) => ({ data, page: 1, pageSize: 20, total: data.length, totalPages: 1 });
const company = { id: "c1", name: "Real Gas Ltd", status: "active", subscriptionStatus: "ACTIVE", stationCount: 2, userCount: 7, createdAt: "2026-01-01T00:00:00Z" };
const calls = (prefix: string) => apiRequest.mock.calls.map(([, p]) => String(p)).filter((p) => p.startsWith(prefix));

beforeEach(() => {
  apiRequest.mockReset();
  where.current = "";
});

describe("list state lives in the address", () => {
  it("a shared link opens the same view: page, sort and filters reach the API", async () => {
    apiRequest.mockResolvedValue(page([company]));
    show("/companies?page=2&sort=name:desc&status=suspended&search=gas", [["/companies", <Companies />]]);
    await screen.findByText("Real Gas Ltd");
    const q = calls("/control/companies?").at(-1)!;
    expect(q).toContain("page=2");
    expect(q).toContain("sort=name%3Adesc");
    expect(q).toContain("status=suspended");
    expect(q).toContain("search=gas");
  });

  it("clicking a column header sorts on the server and records it in the address", async () => {
    apiRequest.mockResolvedValue(page([company]));
    show("/companies?page=3", [["/companies", <Companies />]]);
    fireEvent.click(await screen.findByRole("button", { name: "Company" }));
    await waitFor(() => expect(calls("/control/companies?").at(-1)).toContain("sort=name%3Aasc"));
    expect(where.current).toContain("sort=name%3Aasc");
    expect(where.current).not.toContain("page="); // a new sort starts at the first page
    fireEvent.click(screen.getByRole("button", { name: "Company" }));
    await waitFor(() => expect(calls("/control/companies?").at(-1)).toContain("sort=name%3Adesc"));
  });

  it("payments open on the unmatched ones without cluttering the address; 'All' is remembered", async () => {
    apiRequest.mockResolvedValue(page([]));
    show("/payments", [["/payments", <Payments />]]);
    await screen.findByText("No transactions.");
    expect(calls("/control/pos-transactions?").at(-1)).toContain("matched=no");
    expect(where.current).toBe("/payments");
    apiRequest.mockClear();
    show("/payments?matched=all", [["/payments", <Payments />]]);
    await waitFor(() => expect(calls("/control/pos-transactions?").length).toBeGreaterThan(0));
    expect(calls("/control/pos-transactions?").at(-1)).not.toContain("matched=");
  });

  it("the Users tab is in the address, so a link can open Invitations", async () => {
    apiRequest.mockResolvedValue(page([]));
    show("/users?tab=invitations", [["/users", <Users />]]);
    expect(await screen.findByText("No invitations.")).toBeInTheDocument();
    expect(calls("/control/invites?").length).toBeGreaterThan(0);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "People" }));
    fireEvent.click(screen.getByRole("tab", { name: "People" }));
    expect(await screen.findByText("No users.")).toBeInTheDocument();
    expect(where.current).toBe("/users");
  });

  it("a company opens on the tab its link names, and stays on it", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) => (path === "/control/companies/c1" ? company : page([])));
    show("/companies/c1?tab=cases", [["/companies/:id", <CompanyDetail />]]);
    expect(await screen.findByRole("button", { name: /New case/ })).toBeInTheDocument();
    expect(where.current).toBe("/companies/c1?tab=cases"); // the cases table does not rewrite the address
    fireEvent.click(await screen.findByRole("button", { name: "Case" })); // sorting the embedded table...
    await waitFor(() => expect(calls("/control/cases?").at(-1)).toContain("sort=title%3Aasc")); // ...reaches the API
    expect(where.current).toBe("/companies/c1?tab=cases"); // ...but not the address
  });

  it("choosing a tab puts it in the address; going back to Overview takes it out", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) => (path === "/control/companies/c1" ? company : page([])));
    show("/companies/c1", [["/companies/:id", <CompanyDetail />]]);
    await screen.findByText("Orders");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Integrations" }));
    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));
    await waitFor(() => expect(where.current).toBe("/companies/c1?tab=integrations"));
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Overview" }));
    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    await waitFor(() => expect(where.current).toBe("/companies/c1"));
  });
});

describe("integrations sort on the page (a short list)", () => {
  it("a sort by status puts what is failing first, and again flips it", async () => {
    apiRequest.mockResolvedValue({ data: [
      { id: "a", companyId: "c1", companyName: "Alpha Gas", provider: "whatsapp", status: "healthy" },
      { id: "b", companyId: "c2", companyName: "Beta Gas", provider: "moniepoint", status: "error" },
      { id: "c", companyId: "c3", companyName: "Gamma Gas", provider: "opay", status: "unknown" },
    ] });
    show("/", [["/", <IntegrationsTable />]]);
    await screen.findByText("Alpha Gas");
    const order = () => screen.getAllByRole("row").slice(1).map((r) => r.textContent!.slice(0, 5));
    fireEvent.click(screen.getByRole("button", { name: "Status" }));
    expect(order()).toEqual(["Beta ", "Gamma", "Alpha"]);
    fireEvent.click(screen.getByRole("button", { name: "Status" }));
    expect(order()).toEqual(["Alpha", "Gamma", "Beta "]);
  });
});
