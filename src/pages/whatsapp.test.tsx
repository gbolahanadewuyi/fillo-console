import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { PlatformRole } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
let role: PlatformRole = "platform_support";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: role } }) }));

import WhatsApp from "./WhatsApp";

const row = (over: object = {}) => ({
  id: "w1", companyId: "c1", companyName: "Real Gas", status: "REQUESTED", phoneNumberId: null, displayPhoneNumber: null,
  requestedDisplayName: "Real Gas Orders", requestedContact: "08012345678", requestedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  liveAt: null, statusNote: null, ownToken: false, updatedAt: "2026-10-25T00:00:00Z", ...over,
});
const page = (rows: object[]) => ({ data: rows, page: 1, pageSize: 20, total: rows.length, totalPages: 1 });

function wrap() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><WhatsApp /></MemoryRouter></QueryClientProvider>);
}
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  apiRequest.mockReset();
  role = "platform_support";
});

describe("WhatsApp numbers", () => {
  it("lists who is waiting, how long, and flags the late ones", async () => {
    apiRequest.mockResolvedValue(page([row(), row({ id: "w2", companyName: "Live Gas", status: "LIVE", displayPhoneNumber: "+234 800 000 1" })]));
    wrap();
    expect(await screen.findByText("Real Gas")).toBeInTheDocument();
    expect(screen.getByText("3 days ago")).toHaveClass("text-red-600");
    expect(screen.queryByText("Live Gas")).not.toBeInTheDocument(); // the default view is the work to do
  });

  it("support sets a number up; only what changed is sent", async () => {
    apiRequest.mockImplementation(async (method: string) => (method === "GET" ? page([row()]) : row({ status: "NUMBER_ASSIGNED" })));
    wrap();
    fireEvent.click(await screen.findByRole("button", { name: "Set up" }));
    type("Meta phone number id", "109876543210");
    type("Number customers dial", "+234 800 000 0000");
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Move it to" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Number assigned" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/whatsapp-numbers/w1", { status: "NUMBER_ASSIGNED", phoneNumberId: "109876543210", displayPhoneNumber: "+234 800 000 0000" }),
    );
  });

  it("going live without a number is refused before any request", async () => {
    apiRequest.mockResolvedValue(page([row()]));
    wrap();
    fireEvent.click(await screen.findByRole("button", { name: "Set up" }));
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Move it to" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Live" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/phone number id/);
    expect(apiRequest.mock.calls.filter(([m]) => m === "PATCH")).toHaveLength(0);
  });

  it("a bad Meta id is refused next to the field", async () => {
    apiRequest.mockResolvedValue(page([row()]));
    wrap();
    fireEvent.click(await screen.findByRole("button", { name: "Set up" }));
    type("Meta phone number id", "12ab");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Meta's phone number id is all digits")).toBeInTheDocument();
  });

  it("pausing needs a note the company will read", async () => {
    apiRequest.mockResolvedValue(page([row({ status: "NUMBER_ASSIGNED", phoneNumberId: "1234567", displayPhoneNumber: "+234 800 000 1" })]));
    wrap();
    fireEvent.click(await screen.findByRole("button", { name: "Update" }));
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Move it to" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Paused" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/why it is paused/);
  });

  it("an API refusal keeps the dialog open and says why", async () => {
    apiRequest.mockImplementation(async (method: string) => {
      if (method === "PATCH") throw new ApiError(409, "That phone number id is already used by another company");
      return page([row()]);
    });
    wrap();
    fireEvent.click(await screen.findByRole("button", { name: "Set up" }));
    type("Meta phone number id", "109876543210");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already used");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("finance can look but not change", async () => {
    role = "platform_finance";
    apiRequest.mockResolvedValue(page([row()]));
    wrap();
    await screen.findByText("Real Gas");
    expect(screen.queryByRole("button", { name: "Set up" })).not.toBeInTheDocument();
  });
});
