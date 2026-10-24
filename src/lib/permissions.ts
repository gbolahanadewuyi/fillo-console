/**
 * What each platform role may do in the console.
 *
 * The API is the authority: it checks the role on every request (EOP-API control-routes.ts: reads are open
 * to every platform role, tenant-changing writes need admin or owner, feature flags need owner). This file
 * mirrors that so the console never shows a button that will be refused, and keeps people out of pages that
 * are not theirs. Hiding something here never replaces the server-side check.
 */
import type { PlatformRole } from "@/contexts/AuthContext";

export type Action = "company.suspend" | "company.unsuspend" | "company.branding" | "flag.update";

const ADMIN: PlatformRole[] = ["platform_owner", "platform_admin"];

const ACTION_ROLES: Record<Action, readonly PlatformRole[]> = {
  "company.suspend": ADMIN,
  "company.unsuspend": ADMIN,
  "company.branding": ADMIN,
  "flag.update": ["platform_owner"],
};

export function can(role: PlatformRole | undefined, action: Action): boolean {
  return !!role && ACTION_ROLES[action].includes(role);
}

export type PageKey =
  | "dashboard"
  | "companies"
  | "stations"
  | "users"
  | "integrations"
  | "feature-flags"
  | "plans"
  | "settings"
  | "activity"
  | "audit-logs"
  | "support";

export const PAGE_PATHS: Record<PageKey, string> = {
  dashboard: "/",
  companies: "/companies",
  stations: "/stations",
  users: "/users",
  integrations: "/integrations",
  "feature-flags": "/feature-flags",
  plans: "/plans",
  settings: "/settings",
  activity: "/activity",
  "audit-logs": "/audit-logs",
  support: "/support",
};

const EVERYONE: readonly PlatformRole[] = ["platform_owner", "platform_admin", "platform_support", "platform_finance"];

/** Finance sees plans and billing, not platform internals; support sees what it needs to investigate. */
const PAGE_ROLES: Record<PageKey, readonly PlatformRole[]> = {
  dashboard: EVERYONE,
  companies: EVERYONE,
  stations: EVERYONE,
  users: EVERYONE,
  integrations: EVERYONE,
  activity: EVERYONE,
  "audit-logs": EVERYONE,
  support: EVERYONE,
  "feature-flags": ["platform_owner", "platform_admin", "platform_support"],
  plans: ["platform_owner", "platform_admin", "platform_finance"],
  settings: ADMIN,
};

export function canViewPage(role: PlatformRole | undefined, page: PageKey): boolean {
  return !!role && PAGE_ROLES[page].includes(role);
}

/** The page a URL belongs to (`/companies/abc` belongs to companies), or undefined for unknown paths. */
export function pageForPath(pathname: string): PageKey | undefined {
  const keys = Object.keys(PAGE_PATHS) as PageKey[];
  return keys
    .filter((k) => (PAGE_PATHS[k] === "/" ? pathname === "/" : pathname === PAGE_PATHS[k] || pathname.startsWith(PAGE_PATHS[k] + "/")))
    .sort((a, b) => PAGE_PATHS[b].length - PAGE_PATHS[a].length)[0];
}
