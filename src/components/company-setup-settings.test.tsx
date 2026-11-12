/** The setup cards: what staff enter for a new company is sent to the right setting, with a reason. Uses Seegas's own onboarding values. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PlatformRole } from "@/contexts/AuthContext";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
let role: PlatformRole = "platform_admin";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: role } }) }));
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { CompanySetupSettings, parseCategories } from "./CompanySetupSettings";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

const settings = {
  "payment.bank_details": { bankName: "", accountNumber: "", accountName: "" },
  "expense.default_approval_limit": null,
  "expense.categories": ["FUEL", "RENT"],
  "business.hours": { open: "08:00", close: "18:00" },
};

beforeEach(() => {
  apiRequest.mockReset();
  toast.mockReset();
  role = "platform_admin";
  apiRequest.mockImplementation(async (method: string) => (method === "GET" ? settings : { ok: true }));
});

async function save(buttonName: RegExp, reason = "From Seegas's onboarding document") {
  fireEvent.click(screen.getByRole("button", { name: buttonName }));
  type(await screen.findByLabelText(/reason/i), reason);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

describe("expense categories", () => {
  it("are read one per line or comma separated, without blanks or repeats", () => {
    const text = ["Fuel/transport", "Utilities,", " Maintenance ", "", "fuel/transport", "Bonus/incentives, Petty cash"].join("\n");
    expect(parseCategories(text)).toEqual(["Fuel/transport", "Utilities", "Maintenance", "Bonus/incentives", "Petty cash"]);
  });
});

describe("the setup cards", () => {
  it("send the payment account to the bank-details setting", async () => {
    wrap(<CompanySetupSettings companyId="c1" />);
    type(await screen.findByLabelText("Bank or provider"), "Moniepoint");
    type(screen.getByLabelText("Account name"), "Saturn Epic Energy");
    type(screen.getByLabelText("Account number"), "5409182671");
    await save(/Save payment account/i);
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/companies/c1/settings/payment.bank_details", {
        value: { bankName: "Moniepoint", accountName: "Saturn Epic Energy", accountNumber: "5409182671" },
        reason: "From Seegas's onboarding document",
      }),
    );
  });

  it("will not save a payment account that is incomplete", async () => {
    wrap(<CompanySetupSettings companyId="c1" />);
    type(await screen.findByLabelText("Bank or provider"), "Moniepoint");
    expect(screen.getByRole("button", { name: /Save payment account/i })).toBeDisabled();
  });

  it("send ₦10,000 as the expense limit, and nothing at all as no limit", async () => {
    wrap(<CompanySetupSettings companyId="c1" />);
    type(await screen.findByLabelText("Limit (₦)"), "10000");
    await save(/Save expense approval limit/i);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/companies/c1/settings/expense.default_approval_limit", { value: "10000.00", reason: "From Seegas's onboarding document" }));
  });

  it("send the five categories as a list", async () => {
    wrap(<CompanySetupSettings companyId="c1" />);
    type(await screen.findByLabelText("Categories"), "Fuel/transport\nUtilities\nMaintenance\nBonus/incentives\nPetty cash");
    await save(/Save expense categories/i);
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/companies/c1/settings/expense.categories", { value: ["Fuel/transport", "Utilities", "Maintenance", "Bonus/incentives", "Petty cash"], reason: "From Seegas's onboarding document" }),
    );
  });

  it("send trading hours day by day: Monday to Friday 7 to 6, Saturday 7 to 5, Sunday closed", async () => {
    wrap(<CompanySetupSettings companyId="c1" />);
    for (const d of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) type(await screen.findByLabelText(`${d} opens`), "07:00");
    type(screen.getByLabelText("Saturday closes"), "17:00");
    fireEvent.click(screen.getByRole("switch", { name: "Sunday open" }));
    await save(/Save trading hours/i);
    await waitFor(() => {
      const call = apiRequest.mock.calls.find((c) => c[0] === "PATCH" && String(c[1]).endsWith("business.hours"));
      const value = (call?.[2] as { value: { open: string; days: Record<string, unknown> } }).value;
      expect(value.open).toBe("07:00");
      expect(value.days).toMatchObject({ mon: { open: "07:00", close: "18:00" }, fri: { open: "07:00", close: "18:00" }, sat: { open: "07:00", close: "17:00" }, sun: null });
    });
  });

  it("are read only for support staff", async () => {
    role = "platform_support";
    wrap(<CompanySetupSettings companyId="c1" />);
    expect(await screen.findByLabelText("Bank or provider")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Save payment account/i })).toBeNull();
  });
});
