import { describe, expect, it } from "vitest";
import { can, canViewPage, pageForPath, PAGE_PATHS, type PageKey } from "./permissions";
import type { PlatformRole } from "@/contexts/AuthContext";

const roles: PlatformRole[] = ["platform_owner", "platform_admin", "platform_support", "platform_finance"];

describe("can (mirrors the API role matrix)", () => {
  it("only admin and owner may change a tenant", () => {
    for (const action of ["company.suspend", "company.unsuspend", "company.branding"] as const) {
      expect(roles.filter((r) => can(r, action))).toEqual(["platform_owner", "platform_admin"]);
    }
  });
  it("only admin and owner may retry stuck notification events", () => {
    expect(roles.filter((r) => can(r, "outbox.retry"))).toEqual(["platform_owner", "platform_admin"]);
  });
  it("support may assist a person (unlock, reset, invitations) but only admin and owner may suspend one", () => {
    expect(roles.filter((r) => can(r, "user.assist"))).toEqual(["platform_owner", "platform_admin", "platform_support"]);
    expect(roles.filter((r) => can(r, "user.suspend"))).toEqual(["platform_owner", "platform_admin"]);
  });
  it("support may keep case notes; finance may only read them", () => {
    expect(roles.filter((r) => can(r, "case.write"))).toEqual(["platform_owner", "platform_admin", "platform_support"]);
  });
  it("finance and admins handle billing; support never does", () => {
    expect(roles.filter((r) => can(r, "billing.manage"))).toEqual(["platform_owner", "platform_admin", "platform_finance"]);
  });
  it("only the owner may change feature flags", () => {
    expect(roles.filter((r) => can(r, "flag.update"))).toEqual(["platform_owner"]);
  });
  it("nobody without a role may do anything", () => {
    expect(can(undefined, "company.suspend")).toBe(false);
    expect(can(undefined, "flag.update")).toBe(false);
  });
});

describe("canViewPage", () => {
  it("every role sees the pages used to investigate", () => {
    for (const r of roles) for (const p of ["dashboard", "companies", "users", "orders", "payments", "stock", "cases", "integrations", "audit-logs", "support"] as PageKey[]) expect(canViewPage(r, p)).toBe(true);
  });
  it("finance sees plans and billing but not platform internals (it used to see all of them)", () => {
    expect(canViewPage("platform_finance", "plans")).toBe(true);
    expect(canViewPage("platform_finance", "feature-flags")).toBe(false);
    expect(canViewPage("platform_finance", "settings")).toBe(false);
  });
  it("support cannot open plans or settings", () => {
    expect(canViewPage("platform_support", "plans")).toBe(false);
    expect(canViewPage("platform_support", "settings")).toBe(false);
    expect(canViewPage("platform_support", "feature-flags")).toBe(true);
  });
  it("nobody without a role sees anything", () => {
    expect(canViewPage(undefined, "dashboard")).toBe(false);
  });
});

describe("pageForPath", () => {
  it("maps every page path to its page", () => {
    for (const [key, path] of Object.entries(PAGE_PATHS)) expect(pageForPath(path)).toBe(key);
  });
  it("maps nested paths to their parent page", () => {
    expect(pageForPath("/companies/company-seegas")).toBe("companies");
  });
  it("does not confuse the root path with everything", () => {
    expect(pageForPath("/")).toBe("dashboard");
    expect(pageForPath("/unknown")).toBeUndefined();
  });
  it("does not match on a shared prefix alone", () => {
    expect(pageForPath("/planspecial")).toBeUndefined();
  });
});
