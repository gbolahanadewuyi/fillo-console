import { describe, expect, it } from "vitest";
import { NAV } from "./nav";
import { canViewPage, pageForPath, type PageKey } from "./permissions";

const items = NAV.flatMap((g) => g.items);

describe("navigation", () => {
  it("lists the Platform health page, so technical problems have a place of their own", () => {
    expect(items.find((i) => i.page === "platform")).toMatchObject({ title: "Platform health", url: "/platform" });
  });

  it("every item leads to the page it names, and every role can see Platform health", () => {
    for (const i of items) expect(pageForPath(i.url), i.title).toBe(i.page);
    for (const role of ["platform_owner", "platform_admin", "platform_support", "platform_finance"] as const) expect(canViewPage(role, "platform" as PageKey)).toBe(true);
  });

  it("no page appears twice", () => {
    const pages = items.map((i) => i.page);
    expect(new Set(pages).size).toBe(pages.length);
  });
});
