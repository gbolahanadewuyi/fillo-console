import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, extractArray } from "@/services/api";

// ---------- Types ----------

export interface ControlCompany {
  id: string;
  name: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  industry?: string | null;
  status: "trial" | "active" | "suspended" | "archived" | "past_due" | "canceled";
  subscriptionStatus: string;
  trialEndsAt?: string | null;
  billingProvider?: string | null;
  stationCount: number;
  userCount: number;
  planName?: string | null;
  createdAt: string;
  lastActivityAt?: string | null;
}

export interface ControlStation {
  id: string;
  companyId: string;
  companyName?: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  status: "active" | "suspended";
  userCount?: number;
  orderCount?: number;
  revenue?: string;
  createdAt: string;
}

export interface ControlUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  companyId: string;
  companyName?: string;
  stationId?: string | null;
  stationName?: string | null;
  roleName: string;
  status: "active" | "suspended";
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface ControlStats {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  suspendedCompanies: number;
  totalStations: number;
  activeStations: number;
  totalUsers: number;
  activeUsers: number;
  ordersToday: number;
  revenueToday: string;
  revenue30d: { date: string; revenue: number }[];
  activeIntegrations: number;
  failedIntegrations: number;
}

export interface ControlActivity {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceLabel?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  createdAt: string;
}

export interface IntegrationHealth {
  id: string;
  companyId: string;
  companyName: string;
  provider: string; // whatsapp | moniepoint | opay | instagram
  status: "healthy" | "degraded" | "error" | "disconnected";
  connectedAt?: string | null;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastWebhookAt?: string | null;
}

export interface FeatureFlag {
  key: string;
  label: string;
  description?: string;
  enabledDefault: boolean;
  overrides: { scopeType: "platform" | "company" | "station"; scopeId: string; scopeLabel?: string; enabled: boolean }[];
}

export interface Plan {
  id: string;
  name: string;
  code: string;
  price: string;
  billingCycle: "monthly" | "yearly";
  stationLimit?: number | null;
  userLimit?: number | null;
  featureCodes: string[];
  createdAt: string;
}

// Paginated envelope mirroring EOP-API
interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ---------- Mock fallbacks (used until /control/* is deployed) ----------

const MOCK_COMPANIES: ControlCompany[] = [
  {
    id: "company-seegas",
    name: "Seegas",
    logoUrl: null,
    industry: "LPG Retail",
    status: "active",
    subscriptionStatus: "ACTIVE",
    stationCount: 1,
    userCount: 5,
    planName: "Growth",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    lastActivityAt: new Date().toISOString(),
  },
  {
    id: "company-demo-2",
    name: "Nord Energy",
    logoUrl: null,
    industry: "Fuel & LPG",
    status: "trial",
    subscriptionStatus: "TRIALING",
    trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    stationCount: 1,
    userCount: 3,
    planName: "Starter",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "company-demo-3",
    name: "AquaGas Ltd",
    logoUrl: null,
    industry: "LPG",
    status: "past_due",
    subscriptionStatus: "PAST_DUE",
    stationCount: 2,
    userCount: 8,
    planName: "Scale",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 200).toISOString(),
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
];

const MOCK_STATS: ControlStats = {
  totalCompanies: 3,
  activeCompanies: 1,
  trialCompanies: 1,
  suspendedCompanies: 1,
  totalStations: 4,
  activeStations: 4,
  totalUsers: 16,
  activeUsers: 15,
  ordersToday: 42,
  revenueToday: "482500.00",
  revenue30d: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10),
    revenue: 300000 + Math.round(Math.random() * 400000),
  })),
  activeIntegrations: 5,
  failedIntegrations: 1,
};

// ---------- Helpers that try API then fall back to mock ----------

async function safeRequest<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// ---------- Hooks ----------

export function useControlStats() {
  return useQuery({
    queryKey: ["control", "stats"],
    queryFn: () =>
      safeRequest(
        () => apiRequest<ControlStats>("GET", "/control/stats"),
        MOCK_STATS,
      ),
    refetchInterval: 30_000,
  });
}

export function useControlCompanies(params: { page?: number; pageSize?: number; search?: string; status?: string }) {
  const { page = 1, pageSize = 20, search = "", status = "" } = params;
  return useQuery({
    queryKey: ["control", "companies", page, pageSize, search, status],
    queryFn: async () => {
      try {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("pageSize", String(pageSize));
        if (search) q.set("search", search);
        if (status) q.set("status", status);
        const res = await apiRequest<Paginated<ControlCompany>>("GET", `/control/companies?${q.toString()}`);
        return res;
      } catch {
        // mock filter
        let filtered = MOCK_COMPANIES;
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter((c) => c.name.toLowerCase().includes(s));
        }
        if (status) filtered = filtered.filter((c) => c.status === status);
        return {
          data: filtered.slice((page - 1) * pageSize, page * pageSize),
          page,
          pageSize,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / pageSize) || 1,
        } as Paginated<ControlCompany>;
      }
    },
  });
}

export function useControlCompany(id: string) {
  return useQuery({
    queryKey: ["control", "company", id],
    queryFn: () =>
      safeRequest(
        () => apiRequest<ControlCompany>("GET", `/control/companies/${id}`),
        MOCK_COMPANIES.find((c) => c.id === id) ?? MOCK_COMPANIES[0],
      ),
    enabled: !!id,
  });
}

export function useControlStations(params: { page?: number; pageSize?: number; search?: string; companyId?: string } = {}) {
  const { page = 1, pageSize = 20, search = "", companyId = "" } = params;
  return useQuery({
    queryKey: ["control", "stations", page, pageSize, search, companyId],
    queryFn: async () => {
      try {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("pageSize", String(pageSize));
        if (search) q.set("search", search);
        if (companyId) q.set("companyId", companyId);
        return await apiRequest<Paginated<ControlStation>>("GET", `/control/stations?${q.toString()}`);
      } catch {
        const mock: ControlStation[] = [
          { id: "station-seegas-main", companyId: "company-seegas", companyName: "Seegas", name: "Seegas — Wuse II", status: "active", address: "Wuse II, Abuja", createdAt: new Date().toISOString(), userCount: 5, orderCount: 128, revenue: "1245000.00" },
          { id: "station-nord-1", companyId: "company-demo-2", companyName: "Nord Energy", name: "Nord — VI", status: "active", createdAt: new Date().toISOString(), userCount: 3 },
        ];
        let filtered = mock;
        if (search) filtered = filtered.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
        if (companyId) filtered = filtered.filter((s) => s.companyId === companyId);
        return { data: filtered, page, pageSize, total: filtered.length, totalPages: 1 } as Paginated<ControlStation>;
      }
    },
  });
}

export function useControlUsers(params: { page?: number; pageSize?: number; search?: string; companyId?: string; status?: string } = {}) {
  const { page = 1, pageSize = 20, search = "", companyId = "", status = "" } = params;
  return useQuery({
    queryKey: ["control", "users", page, pageSize, search, companyId, status],
    queryFn: async () => {
      try {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("pageSize", String(pageSize));
        if (search) q.set("search", search);
        if (companyId) q.set("companyId", companyId);
        if (status) q.set("status", status);
        return await apiRequest<Paginated<ControlUser>>("GET", `/control/users?${q.toString()}`);
      } catch {
        const mock: ControlUser[] = [
          { id: "user-owner-seegas", name: "Seegas Owner", email: "owner@seegas.ng", companyId: "company-seegas", companyName: "Seegas", roleName: "Owner", status: "active", createdAt: new Date().toISOString() },
          { id: "user-manager", name: "Amina Bello", email: "amina@seegas.ng", companyId: "company-seegas", companyName: "Seegas", stationName: "Wuse II", roleName: "Manager", status: "active", createdAt: new Date().toISOString() },
          { id: "user-cashier", name: "John Doe", email: "john@nord.ng", companyId: "company-demo-2", companyName: "Nord Energy", roleName: "Cashier", status: "active", createdAt: new Date().toISOString() },
        ];
        let filtered = mock;
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
        }
        if (companyId) filtered = filtered.filter((u) => u.companyId === companyId);
        if (status) filtered = filtered.filter((u) => u.status === status);
        return { data: filtered, page, pageSize, total: filtered.length, totalPages: 1 } as Paginated<ControlUser>;
      }
    },
  });
}

export function useControlActivity(params: { page?: number; pageSize?: number; companyId?: string } = {}) {
  const { page = 1, pageSize = 20, companyId = "" } = params;
  return useQuery({
    queryKey: ["control", "activity", page, pageSize, companyId],
    queryFn: async () => {
      try {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("pageSize", String(pageSize));
        if (companyId) q.set("companyId", companyId);
        return await apiRequest<Paginated<ControlActivity>>("GET", `/control/activity?${q.toString()}`);
      } catch {
        const mock: ControlActivity[] = [
          { id: "act-1", action: "company.created", resourceType: "Company", resourceId: "company-demo-2", resourceLabel: "Nord Energy", companyId: "company-demo-2", companyName: "Nord Energy", createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: "act-2", action: "user.suspended", resourceType: "User", resourceId: "user-3", resourceLabel: "John Doe", companyId: "company-demo-3", companyName: "AquaGas Ltd", createdAt: new Date(Date.now() - 7200000).toISOString() },
          { id: "act-3", action: "integration.failed", resourceType: "PosProviderConnection", resourceId: "conn-1", resourceLabel: "Moniepoint", companyId: "company-seegas", companyName: "Seegas", createdAt: new Date(Date.now() - 10800000).toISOString() },
        ];
        return { data: mock, page, pageSize, total: mock.length, totalPages: 1 } as Paginated<ControlActivity>;
      }
    },
  });
}

export function useControlAuditLogs(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const { page = 1, pageSize = 20, search = "" } = params;
  return useQuery({
    queryKey: ["control", "audit-logs", page, pageSize, search],
    queryFn: async () => {
      try {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("pageSize", String(pageSize));
        if (search) q.set("search", search);
        return await apiRequest<Paginated<ControlActivity>>("GET", `/control/audit-logs?${q.toString()}`);
      } catch {
        return { data: [], page, pageSize, total: 0, totalPages: 1 } as Paginated<ControlActivity>;
      }
    },
  });
}

export function useControlIntegrations() {
  return useQuery({
    queryKey: ["control", "integrations"],
    queryFn: async () => {
      try {
        const raw = await apiRequest<{ data: IntegrationHealth[] } | IntegrationHealth[]>("GET", "/control/integrations");
        return extractArray<IntegrationHealth>(raw, "integrations");
      } catch {
        const mock: IntegrationHealth[] = [
          { id: "int-1", companyId: "company-seegas", companyName: "Seegas", provider: "whatsapp", status: "healthy", connectedAt: new Date().toISOString(), lastSuccessAt: new Date().toISOString() },
          { id: "int-2", companyId: "company-seegas", companyName: "Seegas", provider: "moniepoint", status: "healthy", lastWebhookAt: new Date(Date.now() - 600000).toISOString() },
          { id: "int-3", companyId: "company-demo-2", companyName: "Nord Energy", provider: "opay", status: "degraded", lastFailureAt: new Date(Date.now() - 3600000).toISOString() },
        ];
        return mock;
      }
    },
  });
}

export function useControlFeatureFlags() {
  return useQuery({
    queryKey: ["control", "feature-flags"],
    queryFn: async () => {
      try {
        const raw = await apiRequest<{ data: FeatureFlag[] } | FeatureFlag[]>("GET", "/control/feature-flags");
        return extractArray<FeatureFlag>(raw);
      } catch {
        const mock: FeatureFlag[] = [
          { key: "whatsapp", label: "WhatsApp Integration", description: "Automated WhatsApp ordering via Meta Cloud API", enabledDefault: true, overrides: [] },
          { key: "moniepoint", label: "Moniepoint POS", enabledDefault: true, overrides: [] },
          { key: "opay", label: "OPay POS", enabledDefault: false, overrides: [{ scopeType: "company", scopeId: "company-seegas", scopeLabel: "Seegas", enabled: true }] },
          { key: "automation", label: "Automation Engine", enabledDefault: false, overrides: [] },
          { key: "advanced_reports", label: "Advanced Reports", enabledDefault: true, overrides: [] },
          { key: "multi_station", label: "Multi-Station", enabledDefault: false, overrides: [] },
          { key: "ai_features", label: "AI Assistant", enabledDefault: false, overrides: [] },
        ];
        return mock;
      }
    },
  });
}

export function useControlPlans() {
  return useQuery({
    queryKey: ["control", "plans"],
    queryFn: async () => {
      try {
        const raw = await apiRequest<{ data: Plan[] } | Plan[]>("GET", "/control/plans");
        return extractArray<Plan>(raw);
      } catch {
        const mock: Plan[] = [
          { id: "plan-starter", name: "Starter", code: "starter", price: "15000.00", billingCycle: "monthly", stationLimit: 1, userLimit: 5, featureCodes: ["advanced_reports"], createdAt: new Date().toISOString() },
          { id: "plan-growth", name: "Growth", code: "growth", price: "35000.00", billingCycle: "monthly", stationLimit: 3, userLimit: 15, featureCodes: ["advanced_reports", "whatsapp", "moniepoint"], createdAt: new Date().toISOString() },
          { id: "plan-scale", name: "Scale", code: "scale", price: "75000.00", billingCycle: "monthly", stationLimit: 10, userLimit: 50, featureCodes: ["advanced_reports", "whatsapp", "moniepoint", "opay", "automation", "multi_station"], createdAt: new Date().toISOString() },
        ];
        return mock;
      }
    },
  });
}

export function useControlSearch(q: string) {
  return useQuery({
    queryKey: ["control", "search", q],
    queryFn: async () => {
      if (!q.trim()) return [] as { type: string; id: string; label: string; subtitle?: string; url: string }[];
      try {
        return await apiRequest<{ type: string; id: string; label: string; subtitle?: string; url: string }[]>(
          "GET",
          `/control/search?q=${encodeURIComponent(q)}`,
        );
      } catch {
        // fallback mock search against MOCK_COMPANIES
        const term = q.toLowerCase();
        return MOCK_COMPANIES.filter((c) => c.name.toLowerCase().includes(term)).map((c) => ({
          type: "Company",
          id: c.id,
          label: c.name,
          subtitle: c.industry ?? c.status,
          url: `/companies/${c.id}`,
        }));
      }
    },
    enabled: q.trim().length >= 2,
  });
}

// Mutations

export function useSuspendCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => apiRequest("POST", `/control/companies/${id}/suspend`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled, scopeType, scopeId }: { key: string; enabled: boolean; scopeType?: string; scopeId?: string }) =>
      apiRequest("PUT", `/control/feature-flags/${key}`, { enabled, scopeType, scopeId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control", "feature-flags"] }),
  });
}

export function useUpdateCompanyBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { logoUrl?: string; primaryColor?: string; secondaryColor?: string } }) =>
      apiRequest("PATCH", `/control/companies/${id}/branding`, payload),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["control", "company", v.id] }),
  });
}
