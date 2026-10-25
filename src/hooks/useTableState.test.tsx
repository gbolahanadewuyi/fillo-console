import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { apiValue, useTableState } from "./useTableState";

function setup(initial: string, options: Parameters<typeof useTableState>[0] = {}) {
  return renderHook(() => ({ t: useTableState(options), loc: useLocation() }), { wrapper: ({ children }) => <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter> });
}

describe("useTableState", () => {
  it("reads page, sort and filters from the address, so a shared link opens the same view", () => {
    const { result } = setup("/x?page=3&sort=name:desc&status=active&search=gas");
    expect(result.current.t.page).toBe(3);
    expect(result.current.t.sort).toBe("name:desc");
    expect(result.current.t.filter("status")).toBe("active");
    expect(result.current.t.filter("search")).toBe("gas");
  });

  it("a filter at its default stays out of the address; one that differs goes in", () => {
    const { result } = setup("/x", { filters: { matched: "no" } });
    expect(result.current.t.filter("matched")).toBe("no");
    act(() => result.current.t.setFilter("matched", "yes"));
    expect(result.current.loc.search).toBe("?matched=yes");
    act(() => result.current.t.setFilter("matched", "no"));
    expect(result.current.loc.search).toBe("");
  });

  it('"all" is kept when the default is narrower (it means "no filter"), and dropped when the default already is', () => {
    const narrow = setup("/x", { filters: { status: "OPEN" } });
    act(() => narrow.result.current.t.setFilter("status", "all"));
    expect(narrow.result.current.loc.search).toBe("?status=all");
    expect(narrow.result.current.t.filter("status")).toBe("all");
    expect(apiValue("all")).toBe("");
    const plain = setup("/x");
    act(() => plain.result.current.t.setFilter("status", "all"));
    expect(plain.result.current.loc.search).toBe("");
  });

  it("changing a filter or the sort goes back to page 1; changing the page does not touch them", () => {
    const { result } = setup("/x?page=4&status=active&sort=name:asc");
    act(() => result.current.t.setPage(5));
    expect(result.current.loc.search).toContain("page=5");
    expect(result.current.loc.search).toContain("status=active");
    act(() => result.current.t.setFilter("status", "suspended"));
    expect(result.current.t.page).toBe(1);
    expect(result.current.loc.search).not.toContain("page=");
    act(() => result.current.t.setPage(3));
    act(() => result.current.t.setSort("createdAt:desc"));
    expect(result.current.t.page).toBe(1);
    expect(result.current.t.sort).toBe("createdAt:desc");
  });

  it("returning to the default sort leaves it out of the address", () => {
    const { result } = setup("/x?sort=name:asc", { sort: "createdAt:desc" });
    act(() => result.current.t.setSort("createdAt:desc"));
    expect(result.current.loc.search).toBe("");
    act(() => result.current.t.setSort(undefined));
    expect(result.current.t.sort).toBe("createdAt:desc");
  });

  it("two tables on one page keep to their own prefix", () => {
    const { result } = setup("/x?status=active&inv_status=pending&inv_page=2", { prefix: "inv_" });
    expect(result.current.t.filter("status")).toBe("pending");
    expect(result.current.t.page).toBe(2);
    act(() => result.current.t.setFilter("status", "expired"));
    expect(result.current.loc.search).toContain("status=active");
    expect(result.current.loc.search).toContain("inv_status=expired");
  });

  it("a table in a tab keeps its state in memory and never touches the address", () => {
    const { result } = setup("/x?tab=cases", { syncUrl: false, filters: { status: "OPEN" } });
    act(() => result.current.t.setFilter("status", "RESOLVED"));
    act(() => result.current.t.setPage(2));
    expect(result.current.t.filter("status")).toBe("RESOLVED");
    expect(result.current.t.page).toBe(2);
    expect(result.current.loc.search).toBe("?tab=cases");
  });

  it("junk in the address falls back to page 1", () => {
    expect(setup("/x?page=banana").result.current.t.page).toBe(1);
    expect(setup("/x?page=-4").result.current.t.page).toBe(1);
  });
});
