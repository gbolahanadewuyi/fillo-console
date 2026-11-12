/** The logo chosen when a company is created is uploaded right after it, so the owner's link shows it from the first visit. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));

import { NewCompanyDialog } from "./NewCompanyDialog";

const wrap = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <NewCompanyDialog open onOpenChange={() => undefined} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (method: string, path: string) => {
    if (path.includes("/plans")) return [{ id: "p1", name: "Medium", isActive: true }];
    if (path.includes("slug")) return { available: true };
    if (method === "POST") return { company: { id: "c9", name: "Seegas" }, invite: { email: "o@x.com", emailSent: true }, address: "seegas.fillo.cloud" };
    return { ok: true };
  });
});

describe("the logo field", () => {
  it("refuses a file that is not an image, in words", async () => {
    wrap();
    fireEvent.change(screen.getByLabelText(/Logo/), { target: { files: [new File(["x"], "a.pdf", { type: "application/pdf" })] } });
    expect(await screen.findByText(/PNG, JPG, WebP or SVG/)).toBeInTheDocument();
  });

  it("shows a preview of a good image", async () => {
    wrap();
    fireEvent.change(screen.getByLabelText(/Logo/), { target: { files: [new File(["x"], "logo.png", { type: "image/png" })] } });
    expect(await screen.findByAltText("Chosen logo")).toBeInTheDocument();
  });

  it("uploads the logo to the new company after creating it", async () => {
    wrap();
    type(/Company name/, "Seegas");
    type(/Owner's name/, "Idris Akanbi");
    type(/Owner's email/, "o@x.com");
    type(/^Reason/, "Paid for the year");
    fireEvent.change(screen.getByLabelText(/Logo/), { target: { files: [new File(["x"], "logo.png", { type: "image/png" })] } });
    await screen.findByAltText("Chosen logo");
    fireEvent.click(screen.getByRole("combobox", { name: "Plan" }));
    fireEvent.click(await screen.findByRole("option", { name: "Medium" }));
    fireEvent.click(screen.getByRole("button", { name: /Create company/ }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PATCH", "/control/companies/c9/branding", expect.objectContaining({ logoUrl: expect.stringContaining("data:image/png") })));
  });
});
