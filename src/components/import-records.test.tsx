/** Importing a sheet: the file goes to the API to be checked, nothing is written until the import is confirmed with a reason, and rows that cannot be added are listed with why. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PlatformRole } from "@/contexts/AuthContext";

const { apiUpload, apiDownload } = vi.hoisted(() => ({ apiUpload: vi.fn(), apiDownload: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiUpload, apiDownload }));
let role: PlatformRole = "platform_admin";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: role } }) }));
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { ImportRecords } from "./ImportRecords";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const sheet = () => new File(["Name,Phone\nMama Put,08011112222\n"], "customers.xlsx");
const choose = (file: File) => fireEvent.change(screen.getByLabelText("Excel or CSV file"), { target: { files: [file] } });
const skipped = [{ row: 4, name: "No Phone", reason: "Phone is required" }];

beforeEach(() => {
  apiUpload.mockReset();
  apiDownload.mockReset();
  toast.mockReset();
  role = "platform_admin";
  apiUpload.mockImplementation(async (path: string) =>
    path.includes("dryRun=true")
      ? { kind: "customers", dryRun: true, total: 3, created: 2, skipped, ignoredColumns: ["Tag"] }
      : { kind: "customers", dryRun: false, total: 3, created: 2, skipped },
  );
});

describe("importing customers", () => {
  it("sends the file to be checked first and shows what would be added and left out, writing nothing", async () => {
    wrap(<ImportRecords companyId="c1" />);
    const file = sheet();
    choose(file);
    expect(await screen.findByText(/would be added/)).toBeInTheDocument();
    expect(screen.getByText("Phone is required")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument(); // the row in their own sheet
    expect(screen.getByText(/Left out of customers.xlsx: Tag/)).toBeInTheDocument();
    expect(apiUpload).toHaveBeenCalledTimes(1);
    expect(apiUpload).toHaveBeenCalledWith("/control/companies/c1/import/customers/file?dryRun=true", file, {});
  });

  it("imports only after a reason is given, sends it in a header, then says how many went in", async () => {
    wrap(<ImportRecords companyId="c1" />);
    const file = sheet();
    choose(file);
    const button = await screen.findByRole("button", { name: "Import 2 customers" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "Customer list from Seegas" } });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(apiUpload).toHaveBeenCalledTimes(2));
    expect(apiUpload).toHaveBeenLastCalledWith("/control/companies/c1/import/customers/file?dryRun=false", file, { "X-Import-Reason": encodeURIComponent("Customer list from Seegas") });
    expect(await screen.findByText(/imported/)).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "2 customers imported" }));
  });

  it("shows the API's own message when the file cannot be used", async () => {
    apiUpload.mockRejectedValueOnce(new Error("The file needs a Phone column. Use the template so the headings match"));
    wrap(<ImportRecords companyId="c1" />);
    choose(sheet());
    expect(await screen.findByRole("alert")).toHaveTextContent("needs a Phone column");
  });

  it("downloads the Excel or CSV template for what is being imported", async () => {
    wrap(<ImportRecords companyId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: /Excel template/ }));
    fireEvent.click(screen.getByRole("button", { name: /CSV template/ }));
    await waitFor(() => expect(apiDownload).toHaveBeenCalledTimes(2));
    expect(apiDownload).toHaveBeenNthCalledWith(1, "/control/import/template/customers?format=xlsx");
    expect(apiDownload).toHaveBeenNthCalledWith(2, "/control/import/template/customers?format=csv");
  });

  it("is read only for support staff", () => {
    role = "platform_support";
    wrap(<ImportRecords companyId="c1" />);
    expect(screen.getByLabelText("Excel or CSV file")).toBeDisabled();
  });
});
