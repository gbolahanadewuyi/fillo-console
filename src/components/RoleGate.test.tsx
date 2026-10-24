import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PlatformRole } from "@/contexts/AuthContext";
import { RoleGate } from "./RoleGate";

let role: PlatformRole | undefined;
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: role ? { platformRole: role } : null }) }));

function at(path: string, as: PlatformRole | undefined) {
  role = as;
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RoleGate />}>
          <Route path="*" element={<div>the page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RoleGate", () => {
  it("opens a page the role includes", () => {
    at("/plans", "platform_finance");
    expect(screen.getByText("the page")).toBeInTheDocument();
  });
  it("refuses a page typed into the address bar when the role does not include it", () => {
    at("/plans", "platform_support");
    expect(screen.queryByText("the page")).not.toBeInTheDocument();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });
  it("refuses finance on feature flags and settings (finance used to see both)", () => {
    at("/feature-flags", "platform_finance");
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });
  it("refuses everything when there is no role", () => {
    at("/companies", undefined);
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });
  it("applies to nested paths (a company page belongs to companies)", () => {
    at("/companies/company-seegas", "platform_support");
    expect(screen.getByText("the page")).toBeInTheDocument();
  });
});
