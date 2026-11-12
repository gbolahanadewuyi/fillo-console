/** Deleting a company: the owner sees what goes, must type its exact name and give a reason, and only then can it be done. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { can } from "@/lib/permissions";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));

import { DeleteCompanyDialog, nameMatches } from "./DeleteCompanyDialog";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const company = { id: "c1", name: "Seegas Test" };

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (method: string) =>
    method === "GET" ? { id: "c1", name: "Seegas Test", slug: "seegas", items: [{ label: "People", count: 3 }, { label: "Orders", count: 79 }] } : { ok: true },
  );
});

describe("who can delete", () => {
  it("only the platform owner", () => {
    expect(can("platform_owner", "company.delete")).toBe(true);
    for (const role of ["platform_admin", "platform_support", "platform_finance"] as const) expect(can(role, "company.delete")).toBe(false);
  });
});

describe("the name check", () => {
  it("is exact apart from surrounding spaces", () => {
    expect(nameMatches("Seegas Test", "Seegas Test")).toBe(true);
    expect(nameMatches("  Seegas Test ", "Seegas Test")).toBe(true);
    expect(nameMatches("seegas test", "Seegas Test")).toBe(false);
    expect(nameMatches("Seegas", "Seegas Test")).toBe(false);
    expect(nameMatches("", "Seegas Test")).toBe(false);
  });
});

describe("the delete dialog", () => {
  it("shows what will be deleted", async () => {
    wrap(<DeleteCompanyDialog open onOpenChange={() => undefined} company={company} onDeleted={() => undefined} />);
    expect(await screen.findByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("79")).toBeInTheDocument();
    expect(screen.getByText("People")).toBeInTheDocument();
  });

  it("cannot be confirmed until the exact name and a real reason are typed", async () => {
    wrap(<DeleteCompanyDialog open onOpenChange={() => undefined} company={company} onDeleted={() => undefined} />);
    const button = await screen.findByRole("button", { name: "Delete permanently" });
    expect(button).toBeDisabled();
    type(screen.getByLabelText(/Reason/), "Test company, not needed");
    expect(button).toBeDisabled(); // reason alone is not enough
    type(screen.getByLabelText(/Type/), "Seegas");
    expect(button).toBeDisabled(); // a part of the name is not enough
    type(screen.getByLabelText(/Type/), "Seegas Test");
    expect(button).toBeEnabled();
    type(screen.getByLabelText(/Reason/), "no");
    expect(button).toBeDisabled(); // and a throwaway reason is refused
  });

  it("sends the typed name and the reason, then reports the company as deleted", async () => {
    const onDeleted = vi.fn();
    wrap(<DeleteCompanyDialog open onOpenChange={() => undefined} company={company} onDeleted={onDeleted} />);
    await screen.findByText("Orders");
    type(screen.getByLabelText(/Type/), "Seegas Test");
    type(screen.getByLabelText(/Reason/), "Test company, not needed");
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/control/companies/c1/delete", { confirmName: "Seegas Test", reason: "Test company, not needed" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });

  it("stays open and shows the error when the server refuses", async () => {
    apiRequest.mockImplementation(async (method: string) => {
      if (method === "GET") return { id: "c1", name: "Seegas Test", slug: null, items: [] };
      throw new Error("Type the company's name exactly to confirm");
    });
    const onDeleted = vi.fn();
    wrap(<DeleteCompanyDialog open onOpenChange={() => undefined} company={company} onDeleted={onDeleted} />);
    type(await screen.findByLabelText(/Type/), "Seegas Test");
    type(screen.getByLabelText(/Reason/), "Test company, not needed");
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("name exactly");
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
