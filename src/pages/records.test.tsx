import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApiError } from "@/services/api";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
let role = "platform_support";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: role } }) }));

import Orders from "./Orders";
import OrderDetail from "./OrderDetail";
import Payments from "./Payments";
import Stock from "./Stock";
import CompanyDetail from "./CompanyDetail";

function show(path: string, routes: [string, React.ReactElement][]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {routes.map(([p, el]) => <Route key={p} path={p} element={el} />)}
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const page = (data: unknown[]) => ({ data, page: 1, pageSize: 20, total: data.length, totalPages: 1 });

const order = {
  id: "o1", orderNumber: 4021, companyId: "c1", companyName: "Real Gas Ltd", stationName: "Lekki", customer: { id: "k1", name: "Ngozi", phone: "0803" }, type: "DELIVERY", channel: "WHATSAPP",
  status: "AWAITING_PAYMENT", paymentStatus: "PARTIALLY_PAID", subtotal: "1000", discount: "0", vatAmount: "0", total: "1000", paidTotal: "600", refundedTotal: "100", balanceDue: "500",
  notes: null, deletedAt: null, createdBy: "Ada", createdAt: "2026-10-20T10:00:00Z", invoice: null,
  intake: { id: "i1", channel: "WHATSAPP", source: "WEBHOOK", customerPhone: "0803", messageText: "Please send 10kg gas", status: "CONVERTED", createdAt: "2026-10-20T09:59:00Z" },
  deliveries: [{ id: "d1", status: "DELIVERED", createdAt: "2026-10-20T10:00:00Z", assignedAt: "2026-10-20T10:30:00Z", completedAt: "2026-10-20T12:10:00Z", riderName: "Ibrahim" }],
  cases: [{ id: "k9", title: "Customer disputes the amount", status: "OPEN", createdAt: "2026-10-21T09:00:00Z" }],
  lines: [{ id: "l1", productName: "Cooking gas", quantity: "10", unit: "KG", unitPrice: "100", lineTotal: "1000" }],
  payments: [{ id: "p1", amount: "600", method: "POS", reference: "REF-1", paidAt: "2026-10-20T10:05:00Z", recordedBy: "Ada", pos: { id: "t1", provider: "MONIEPOINT", externalReference: "T-9" } }],
  refunds: [{ id: "r1", amount: "100", method: "CASH", reason: "wrong size", createdAt: "2026-10-20T11:00:00Z" }],
  movements: [{ id: "m1", productName: "Cooking gas", quantity: "-10", type: "SALE", createdAt: "2026-10-20T10:00:00Z" }],
  timeline: [
    { id: "a1", action: "order.created", actorName: "Ada", createdAt: "2026-10-20T10:00:00Z", status: null, note: null },
    { id: "a2", action: "order.status_changed", actorName: "Ada", createdAt: "2026-10-20T10:20:00Z", status: "PREPARING", note: null },
    { id: "a3", action: "order.status_changed", actorName: "Chidi", createdAt: "2026-10-20T12:15:00Z", status: "COMPLETED", note: null },
  ],
};

beforeEach(() => {
  apiRequest.mockReset();
  role = "platform_support";
});

describe("orders", () => {
  it("lists real orders and links each to its record", async () => {
    apiRequest.mockResolvedValue(page([{ id: "o1", orderNumber: 4021, companyId: "c1", companyName: "Real Gas Ltd", stationName: "Lekki", customerName: null, customerPhone: null, type: "WALK_IN", channel: "WALK_IN", status: "PAID", paymentStatus: "PAID", total: "2500", deleted: false, createdAt: "2026-10-20T10:00:00Z" }]));
    show("/orders", [["/orders", <Orders />]]);
    const link = await screen.findByText("#4021");
    expect(link.closest("a")).toHaveAttribute("href", "/orders/o1");
    expect(screen.getByText("Walk-in")).toBeInTheDocument();
    expect(screen.getByText(/2,500/)).toBeInTheDocument();
  });

  it("a company link narrows the list to that company and says so", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) => (path.startsWith("/control/companies/") ? { id: "c1", name: "Real Gas Ltd" } : page([])));
    show("/orders?companyId=c1", [["/orders", <Orders />]]);
    expect(await screen.findByRole("button", { name: /Real Gas Ltd only/ })).toBeInTheDocument();
    await waitFor(() => expect(apiRequest.mock.calls.some(([, p]) => String(p).startsWith("/control/orders?") && String(p).includes("companyId=c1"))).toBe(true));
  });

  it("an API failure is shown, with no orders", async () => {
    apiRequest.mockRejectedValue(new ApiError(500, "db is down"));
    show("/orders", [["/orders", <Orders />]]);
    expect(await screen.findByRole("alert")).toHaveTextContent("db is down");
  });

  it("an order shows what was paid, refunded and still owed, the stock it moved, the message it came from, and the timeline", async () => {
    apiRequest.mockResolvedValue(order);
    show("/orders/o1", [["/orders/:id", <OrderDetail />]]);
    expect(await screen.findByText("Order #4021")).toBeInTheDocument();
    expect(screen.getByText("Still owed").nextSibling).toHaveTextContent(/500/);
    expect(screen.getByText(/matched to Moniepoint T-9/)).toBeInTheDocument();
    expect(screen.getAllByText(/wrong size/).length).toBeGreaterThan(0); // in the refunds list and in the timeline
    expect(screen.getByText("Please send 10kg gas")).toBeInTheDocument();
    // the timeline says what happened, not the event codes
    expect(screen.queryByText("order.created")).not.toBeInTheDocument();
    expect(screen.getByText("Being prepared")).toBeInTheDocument();
    expect(screen.getByText("Assigned to Ibrahim")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText(/Placed to delivered: 2 h 10 min/)).toBeInTheDocument();
    expect(screen.getByText("Sale · 20 Oct 2026, 11:00 am".slice(0, 4), { exact: false })).toBeInTheDocument();
  });

  it("lists the cases already opened about the order, each a link, so the same problem is not opened twice", async () => {
    apiRequest.mockResolvedValue(order);
    show("/orders/o1", [["/orders/:id", <OrderDetail />]]);
    const link = await screen.findByText("Customer disputes the amount");
    expect(link.closest("a")).toHaveAttribute("href", "/cases/k9");
    expect(screen.getByText("Cases about this order")).toBeInTheDocument();
  });

  it("an order with no cases shows no empty cases box", async () => {
    apiRequest.mockResolvedValue({ ...order, cases: [] });
    show("/orders/o1", [["/orders/:id", <OrderDetail />]]);
    await screen.findByText("Order #4021");
    expect(screen.queryByText("Cases about this order")).not.toBeInTheDocument();
  });

  it("a deleted order says so", async () => {
    apiRequest.mockResolvedValue({ ...order, deletedAt: "2026-10-21T10:00:00Z" });
    show("/orders/o1", [["/orders/:id", <OrderDetail />]]);
    expect(await screen.findByRole("alert")).toHaveTextContent(/was deleted/);
  });

  it("a missing order says so", async () => {
    apiRequest.mockRejectedValue(new ApiError(404, "Order not found"));
    show("/orders/zzz", [["/orders/:id", <OrderDetail />]]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Order not found");
  });
});

describe("payments and stock", () => {
  it("opens on transactions not matched to an order, and links matched ones to the order", async () => {
    apiRequest.mockResolvedValue(page([
      { id: "t1", companyId: "c1", companyName: "Real Gas Ltd", provider: "MONIEPOINT", externalReference: "T-LOOSE", amount: "600", fee: null, status: "SUCCESSFUL", paidAt: "2026-10-20T10:00:00Z", matched: false, matchedOrderId: null, matchedOrderNumber: null, matchedAt: null },
      { id: "t2", companyId: "c1", companyName: "Real Gas Ltd", provider: "MONIEPOINT", externalReference: "T-OK", amount: "900", fee: null, status: "SUCCESSFUL", paidAt: "2026-10-20T10:00:00Z", matched: true, matchedOrderId: "o1", matchedOrderNumber: 4021, matchedAt: null },
    ]));
    show("/payments", [["/payments", <Payments />]]);
    expect(await screen.findByText("T-LOOSE")).toBeInTheDocument();
    expect(screen.getByText("Not matched")).toBeInTheDocument();
    expect(screen.getByText("#4021").closest("a")).toHaveAttribute("href", "/orders/o1");
    expect(apiRequest.mock.calls[0]![1]).toContain("matched=no");
  });

  it("stock movements show the sign, the unit and the order behind them", async () => {
    apiRequest.mockResolvedValue(page([{ id: "m1", companyId: "c1", companyName: "Real Gas Ltd", stationName: "Lekki", productName: "Cooking gas", unit: "KG", quantity: "-10", type: "SALE", orderId: "o1", orderNumber: 4021, note: null, createdAt: "2026-10-20T10:00:00Z" }]));
    show("/stock", [["/stock", <Stock />]]);
    expect(await screen.findByText("-10 kg")).toBeInTheDocument();
    expect(screen.getByText("#4021").closest("a")).toHaveAttribute("href", "/orders/o1");
  });
});

describe("company page", () => {
  const gas = (over: object = {}) => ({ id: "c1", name: "Real Gas Ltd", status: "active", subscriptionStatus: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", stationCount: 1, userCount: 1, ...over });

  it("an admin can mark a company as a test company with a reason; support cannot see the control", async () => {
    role = "platform_admin";
    apiRequest.mockImplementation(async (m: string, path: string) => (m === "PATCH" ? { ok: true } : path === "/control/companies/c1" ? gas() : page([])));
    show("/companies/c1", [["/companies/:id", <CompanyDetail />]]);
    fireEvent.click(await screen.findByRole("button", { name: "Mark as a test company" }));
    const confirm = await screen.findByRole("button", { name: "Mark as test" });
    expect(confirm).toBeDisabled(); // a reason is needed
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "used for demos" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/companies/c1/test", { isTest: true, reason: "used for demos" }));
  });

  it("a test company is badged, and can be put back with a reason", async () => {
    role = "platform_admin";
    apiRequest.mockImplementation(async (m: string, path: string) => (m === "PATCH" ? { ok: true } : path === "/control/companies/c1" ? gas({ isTest: true }) : page([])));
    show("/companies/c1", [["/companies/:id", <CompanyDetail />]]);
    expect(await screen.findByText("Test")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark as a real company" }));
    fireEvent.change(await screen.findByLabelText(/reason/i), { target: { value: "real customer after all" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark as real" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/companies/c1/test", { isTest: false, reason: "real customer after all" }));
  });

  it("support does not get the control", async () => {
    role = "platform_support";
    apiRequest.mockImplementation(async (_m: string, path: string) => (path === "/control/companies/c1" ? gas() : page([])));
    show("/companies/c1", [["/companies/:id", <CompanyDetail />]]);
    await screen.findByText("Orders");
    expect(screen.queryByRole("button", { name: /test company|real company/ })).not.toBeInTheDocument();
  });

  it("links to that company's records, and its Users tab links each person to their access page", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) => {
      if (path === "/control/companies/c1") return { id: "c1", name: "Real Gas Ltd", status: "active", subscriptionStatus: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", stationCount: 1, userCount: 1 };
      if (path.startsWith("/control/users")) return page([{ id: "u1", name: "Ada Attendant", email: "ada@gas.test", roleName: "Attendant", status: "active", companyId: "c1", createdAt: "2026-01-01T00:00:00Z" }]);
      return page([]);
    });
    show("/companies/c1", [["/companies/:id", <CompanyDetail />]]);
    expect(await screen.findByText("Orders")).toHaveAttribute("href", "/orders?companyId=c1");
    expect(screen.getByText("Payments")).toHaveAttribute("href", "/payments?companyId=c1");
    expect(screen.getByText("Stock")).toHaveAttribute("href", "/stock?companyId=c1");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "People" }));
    fireEvent.click(screen.getByRole("tab", { name: "People" }));
    expect((await screen.findByText("Ada Attendant")).closest("a")).toHaveAttribute("href", "/users/u1");
  });

  it("is a workspace: its Integrations, Cases and invitations show only this company's, never another's", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) => {
      if (path === "/control/companies/c1") return { id: "c1", name: "Real Gas Ltd", status: "active", subscriptionStatus: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", stationCount: 1, userCount: 1 };
      if (path.startsWith("/control/integrations"))
        return { data: [
          { id: "i1", companyId: "c1", companyName: "Real Gas Ltd", provider: "whatsapp", status: "healthy" },
          { id: "i2", companyId: "c2", companyName: "Other Gas Ltd", provider: "moniepoint", status: "error" },
        ] };
      return page([]);
    });
    show("/companies/c1", [["/companies/:id", <CompanyDetail />]]);
    await screen.findByText("Orders");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Integrations" }));
    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));
    expect(await screen.findByText("whatsapp")).toBeInTheDocument();
    expect(screen.queryByText("moniepoint")).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Cases" }));
    fireEvent.click(screen.getByRole("tab", { name: "Cases" }));
    await waitFor(() => expect(apiRequest.mock.calls.some(([, p]) => String(p).startsWith("/control/cases?") && String(p).includes("companyId=c1"))).toBe(true));

    fireEvent.mouseDown(screen.getByRole("tab", { name: "People" }));
    fireEvent.click(screen.getByRole("tab", { name: "People" }));
    await waitFor(() => expect(apiRequest.mock.calls.some(([, p]) => String(p).startsWith("/control/invites?") && String(p).includes("companyId=c1"))).toBe(true));
  });

  it("the settings tab refuses a colour that is not hex, next to the field, and saves nothing", async () => {
    role = "platform_admin";
    apiRequest.mockImplementation(async (_m: string, path: string) => (path === "/control/companies/c1" ? { id: "c1", name: "Real Gas Ltd", status: "active", subscriptionStatus: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", stationCount: 1, userCount: 1, primaryColor: "#112233", secondaryColor: "#445566" } : page([])));
    show("/companies/c1?tab=branding", [["/companies/:id", <CompanyDetail />]]);
    fireEvent.change(await screen.findByLabelText("Primary colour"), { target: { value: "blue" } });
    fireEvent.click(screen.getByRole("button", { name: "Save branding" }));
    expect(await screen.findByText("Use a hex colour like #1B6EF3.")).toBeInTheDocument();
    expect(apiRequest.mock.calls.some(([m]) => m === "PATCH")).toBe(false);
    fireEvent.change(screen.getByLabelText("Primary colour"), { target: { value: "#abcdef" } });
    fireEvent.click(screen.getByRole("button", { name: "Save branding" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/companies/c1/branding", { primaryColor: "#abcdef", secondaryColor: "#445566" }));
  });
});
