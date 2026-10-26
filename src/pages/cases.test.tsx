import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PlatformRole } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
let role: PlatformRole = "platform_support";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: role } }) }));

import Cases from "./Cases";
import CaseDetail from "./CaseDetail";

function show(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const theCase = (over: object = {}) => ({
  id: "k1", title: "Payment not showing", status: "OPEN", companyId: "c1", companyName: "Real Gas Ltd",
  user: { id: "u1", name: "Ada", email: "ada@gas.test" }, order: { id: "o1", orderNumber: 4021 }, posTransaction: { id: "t1", externalReference: "T-9", provider: "MONIEPOINT" },
  createdBy: "Sam Support", resolvedBy: null, resolvedAt: null, createdAt: "2026-10-24T10:00:00Z", updatedAt: "2026-10-24T10:00:00Z",
  notes: [{ id: "n1", author: "Sam Support", body: "Customer says card was charged", createdAt: "2026-10-24T10:00:00Z" }],
  ...over,
});
const page = (data: unknown[]) => ({ data, page: 1, pageSize: 20, total: data.length, totalPages: 1 });

beforeEach(() => {
  apiRequest.mockReset();
  role = "platform_support";
});

describe("cases list", () => {
  it("lists real cases, opens on the open ones, and links each to its page", async () => {
    apiRequest.mockResolvedValue(page([{ id: "k1", title: "Payment not showing", status: "OPEN", companyId: "c1", companyName: "Real Gas Ltd", createdBy: "Sam Support", noteCount: 2, createdAt: "2026-10-24T10:00:00Z", updatedAt: "2026-10-24T10:00:00Z" }]));
    show("/cases");
    expect((await screen.findByText("Payment not showing")).closest("a")).toHaveAttribute("href", "/cases/k1");
    expect(apiRequest.mock.calls[0]![1]).toContain("status=OPEN");
    expect(screen.getByText("Real Gas Ltd")).toBeInTheDocument();
  });

  it("finance can read but is not offered New case", async () => {
    role = "platform_finance";
    apiRequest.mockResolvedValue(page([]));
    show("/cases");
    expect(await screen.findByText("No cases.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New case/ })).not.toBeInTheDocument();
  });

  it("a link from an order opens the dialog with that company and order filled in, and the case is made with exactly them", async () => {
    apiRequest.mockImplementation(async (method: string, path: string) => {
      if (method === "POST") return theCase();
      if (path.startsWith("/control/companies")) return page([]);
      return page([]);
    });
    show("/cases?new=1&companyId=c1&orderId=o1");
    fireEvent.change(await screen.findByLabelText("Title"), { target: { value: "  Missing payment  " } });
    fireEvent.click(screen.getByRole("button", { name: "Open case" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/control/cases", { companyId: "c1", title: "Missing payment", userId: undefined, orderId: "o1", posTransactionId: undefined, note: undefined }));
  });

  it("opening a case from an order says which order it is about, so the link is visible", async () => {
    apiRequest.mockImplementation(async (_m: string, path: string) => (path === "/control/orders/o1" ? { id: "o1", orderNumber: 4021 } : page([])));
    show("/cases?new=1&companyId=c1&orderId=o1");
    expect(await screen.findByText(/About order #4021\. It is linked automatically\./)).toBeInTheDocument();
  });

  it("a case opened with no order, person or payment says nothing about a link", async () => {
    apiRequest.mockResolvedValue(page([]));
    show("/cases?new=1&companyId=c1");
    await screen.findByLabelText("Title");
    expect(screen.queryByText(/linked automatically/)).not.toBeInTheDocument();
  });

  it("a title that is too short, or no company, is refused next to the field and nothing is sent", async () => {
    apiRequest.mockResolvedValue(page([]));
    show("/cases?new=1");
    fireEvent.change(await screen.findByLabelText("Title"), { target: { value: "ab" } });
    fireEvent.click(screen.getByRole("button", { name: "Open case" }));
    expect(await screen.findByText("Give the case a short title")).toBeInTheDocument();
    expect(screen.getAllByText("Choose a company")).toHaveLength(2); // the placeholder and the error under it
    expect(apiRequest.mock.calls.some(([m]) => m === "POST")).toBe(false);
  });

  it("a failed API says so", async () => {
    apiRequest.mockRejectedValue(new ApiError(500, "db is down"));
    show("/cases");
    expect(await screen.findByRole("alert")).toHaveTextContent("db is down");
  });
});

describe("case page", () => {
  it("shows the links, who said what and when", async () => {
    apiRequest.mockResolvedValue(theCase());
    show("/cases/k1");
    expect(await screen.findByText("Payment not showing")).toBeInTheDocument();
    expect(screen.getByText("Ada").closest("a")).toHaveAttribute("href", "/users/u1");
    expect(screen.getByText("#4021").closest("a")).toHaveAttribute("href", "/orders/o1");
    expect(screen.getByText("Real Gas Ltd").closest("a")).toHaveAttribute("href", "/companies/c1");
    expect(screen.getByText("Customer says card was charged")).toBeInTheDocument();
  });

  it("adds a note with exactly what was typed (trimmed) and then clears the box", async () => {
    apiRequest.mockImplementation(async (method: string) => (method === "POST" ? theCase({ notes: [] }) : theCase()));
    show("/cases/k1");
    const box = await screen.findByLabelText("Add a note");
    expect(screen.getByRole("button", { name: "Add note" })).toBeDisabled();
    fireEvent.change(box, { target: { value: "  Rang the customer  " } });
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/control/cases/k1/notes", { body: "Rang the customer" }));
    await waitFor(() => expect(box).toHaveValue(""));
  });

  it("resolves with the typed text as the resolution note; a resolved case offers Reopen instead", async () => {
    apiRequest.mockImplementation(async (method: string) => (method === "POST" ? theCase({ status: "RESOLVED" }) : theCase()));
    show("/cases/k1");
    fireEvent.change(await screen.findByLabelText("Add a note"), { target: { value: "typo in the reference" } });
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/control/cases/k1/resolve", { note: "typo in the reference" }));
    expect(await screen.findByRole("button", { name: "Reopen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resolve" })).not.toBeInTheDocument();
  });

  it("finance reads the case and cannot add to it", async () => {
    role = "platform_finance";
    apiRequest.mockResolvedValue(theCase());
    show("/cases/k1");
    expect(await screen.findByText(/can read cases but not add/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Add a note")).not.toBeInTheDocument();
  });

  it("a link whose target was deleted says so; a missing case says so", async () => {
    apiRequest.mockResolvedValue(theCase({ order: { id: "o9", orderNumber: null } }));
    const first = show("/cases/k1");
    expect(await screen.findByText("Order no longer exists")).toBeInTheDocument();
    first.unmount();
    apiRequest.mockRejectedValue(new ApiError(404, "Case not found"));
    show("/cases/zzz");
    expect(await screen.findByRole("alert")).toHaveTextContent("Case not found");
  });
});
