/** Fillo staff helping a company: change its order editing rules, and correct one of its orders. Both ask for a reason and send exactly what was chosen. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PlatformRole } from "@/contexts/AuthContext";
import type { ControlOrder } from "@/hooks/useControlApi";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
let role: PlatformRole = "platform_admin";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: role } }) }));

import { OrderEditingOverride } from "./OrderEditingOverride";
import { OrderOverridePanel } from "./OrderOverridePanel";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const rules = { lockAfterHours: 48, hardLockAfterDays: 90, cashierEditMinutes: 30, cashierCorrectionMinutes: 10 };

const order = {
  id: "o1", orderNumber: 1042, status: "COMPLETED", total: "9000", paidTotal: "9000", deletedAt: null, customer: null,
  lines: [{ id: "l1", productId: "p-gas", productName: "Cooking Gas", quantity: "6", unit: "KG", unitPrice: "1500", lineTotal: "9000" }],
  payments: [{ id: "pay1", amount: "9000", method: "CASH", reference: null, paidAt: "2026-01-01T10:00:00Z", recordedBy: null, pos: null }],
} as unknown as ControlOrder;

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (method: string) => (method === "GET" ? { "orders.editing": rules } : { ok: true }));
  role = "platform_admin";
});

describe("a company's order editing rules", () => {
  it("sends the new numbers with the reason", async () => {
    wrap(<OrderEditingOverride companyId="c1" />);
    type(await screen.findByLabelText("Lock orders after"), "72");
    fireEvent.click(screen.getByRole("button", { name: "Save order editing" }));
    type(await screen.findByLabelText(/reason/i), "Owner asked on the phone");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/companies/c1/settings/orders.editing", { value: { ...rules, lockAfterHours: 72 }, reason: "Owner asked on the phone" }),
    );
  });

  it("is read only for support staff", async () => {
    role = "platform_support";
    wrap(<OrderEditingOverride companyId="c1" />);
    expect(await screen.findByLabelText("Lock orders after")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save order editing" })).toBeNull();
  });
});

describe("correcting an order for a company", () => {
  it("sends the changed quantity, and says how a lower total is treated, with the reason", async () => {
    wrap(<OrderOverridePanel order={order} />);
    type(screen.getByLabelText("Cooking Gas"), "4");
    fireEvent.click(screen.getByRole("button", { name: "Change quantities" }));
    type(await screen.findByLabelText(/reason/i), "Owner called: wrong quantity");
    fireEvent.click(screen.getByRole("button", { name: "Change order" }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/orders/o1", { lines: [{ productId: "p-gas", quantity: "4" }], reason: "Owner called: wrong quantity", reduction: { kind: "CORRECTION" } }),
    );
  });

  it("corrects a payment with the chosen amount and method", async () => {
    wrap(<OrderOverridePanel order={order} />);
    type(screen.getByLabelText("Correct amount"), "6000");
    fireEvent.click(screen.getByRole("button", { name: "Correct the payment" }));
    type(await screen.findByLabelText(/reason/i), "Keyed wrongly");
    fireEvent.click(screen.getByRole("button", { name: "Correct payment" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/control/orders/o1/payments/pay1/correct", { amount: "6000.00", method: "CASH", reason: "Keyed wrongly" }));
  });

  it("moves the order to another customer by phone", async () => {
    wrap(<OrderOverridePanel order={order} />);
    type(screen.getByLabelText("Customer phone"), "08033331111");
    fireEvent.click(screen.getByRole("button", { name: "Change the customer" }));
    type(await screen.findByLabelText(/reason/i), "Wrong customer");
    fireEvent.click(screen.getByRole("button", { name: "Change customer" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/orders/o1/customer", { customerPhone: "08033331111", reason: "Wrong customer" }));
  });

  it("offers nothing on a cancelled order", () => {
    wrap(<OrderOverridePanel order={{ ...order, status: "CANCELLED" }} />);
    expect(screen.queryByRole("button", { name: "Change quantities" })).toBeNull();
  });
});
