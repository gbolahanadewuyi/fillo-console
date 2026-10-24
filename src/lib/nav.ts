import { LayoutDashboard, Building2, Users, Store, Plug, Flag, FileText, Activity, ScrollText, Search, Settings, type LucideIcon } from "lucide-react";
import { PAGE_PATHS, type PageKey } from "@/lib/permissions";

export interface NavItem {
  page: PageKey;
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const item = (page: PageKey, title: string, icon: LucideIcon): NavItem => ({ page, title, url: PAGE_PATHS[page], icon });

/** One navigation for the sidebar and the mobile menu. Pages that do not exist yet are not listed. */
export const NAV: NavGroup[] = [
  { label: "Overview", items: [item("dashboard", "Dashboard", LayoutDashboard)] },
  { label: "Customers", items: [item("companies", "Companies", Building2), item("stations", "Stations", Store), item("users", "Users", Users)] },
  {
    label: "Platform",
    items: [item("integrations", "Integrations", Plug), item("feature-flags", "Feature Flags", Flag), item("plans", "Plans & Billing", FileText), item("settings", "System Settings", Settings)],
  },
  { label: "Support", items: [item("activity", "Activity", Activity), item("audit-logs", "Audit Logs", ScrollText), item("support", "Search", Search)] },
];

/** The four destinations pinned to the mobile tab bar. */
export const MOBILE_TABS: { page: PageKey; title: string; icon: LucideIcon }[] = [
  { page: "dashboard", title: "Home", icon: LayoutDashboard },
  { page: "companies", title: "Companies", icon: Building2 },
  { page: "stations", title: "Stations", icon: Store },
  { page: "users", title: "Users", icon: Users },
];
