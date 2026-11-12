/** Importing a sheet: it is checked first, nothing is written until the import is confirmed with a reason, and rows that cannot be added are listed with why. */
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

import { ImportRecords } from "./ImportRecords";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const csv = (text: string) => {
  const file = new File([text], "customers.csv", { type: "text/csv" });
  Object.defineProperty(file, "text", { value: async () => text }); // jsdom's File has no text()
  return file;
};
const choose = (file: File) => fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });

beforeEach(() => {
  apiRequest.mockReset();
  toast.mockReset();
  role = "platform_admin";
  apiRequest.mockImplementation(async (_m: string, _p: string, body: { dryRun: boolean }) =>
    body.dryRun
      ? { kind: "customers", dryRun: true, total: 3, created: 2, skipped: [{ row: 3, name: "No Phone", reason: "Phone is required" }] }
      : { kind: "customers", dryRun: false, total: 3, created: 2, skipped: [{ row: 3, name: "No Phone", reason: "Phone is required" }] },
  );
});

describe("importing customers", () => {
  it("checks the sheet first and shows what would be added and what would be left out, writing nothing", async () => {
    wrap(<ImportRecords companyId="c1" />);
    choose(csv("Full Name,Phone Number\nMama Put,08011112222\nChidi,08033334444\nNo Phone,\n"));
    expect(await screen.findByText(/would be added/)).toBeInTheDocument();
    expect(screen.getByText("Phone is required")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith("POST", "/control/companies/c1/import/customers", {
      rows: [{ name: "Mama Put", phone: "08011112222" }, { name: "Chidi", phone: "08033334444" }, { name: "No Phone", phone: "" }],
      dryRun: true,
    });
  });

  it("imports only after a reason is given, then says how many went in", async () => {
    wrap(<ImportRecords companyId="c1" />);
    choose(csv("name,phone\nMama Put,08011112222\nChidi,08033334444\nNo Phone,\n"));
    const button = await screen.findByRole("button", { name: "Import 2 customers" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "Customer list from Seegas" } });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
    expect(apiRequest.mock.calls[1]![2]).toMatchObject({ dryRun: false, reason: "Customer list from Seegas" });
    expect(await screen.findByText(/imported/)).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "2 customers imported" }));
  });

  it("says what is missing instead of sending a sheet that cannot work", async () => {
    wrap(<ImportRecords companyId="c1" />);
    choose(csv("Name,Address\nMama Put,12 Allen Avenue\n"));
    expect(await screen.findByRole("alert")).toHaveTextContent("needs a phone column");
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("is read only for support staff", () => {
    role = "platform_support";
    wrap(<ImportRecords companyId="c1" />);
    expect(screen.getByLabelText("CSV file")).toBeDisabled();
  });
});
