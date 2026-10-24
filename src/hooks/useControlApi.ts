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
  /** Connections whose own recorded events say they are failing or unreliable. */
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
  /** Why the person made this change, when one was recorded. */
  reason?: string | null;
  createdAt: string;
}

export interface IntegrationHealth {
  id: string;
  /** null for platform-level connections such as Fillo's own billing provider. */
  companyId: string | null;
  companyName: string;
  provider: string; // whatsapp | moniepoint | opay | instagram
  status: "healthy" | "degraded" | "error" | "disconnected" | "unknown";
  connectedAt?: string | null;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastFailureDetail?: string | null;
  lastWebhookAt?: string | null;
}

export interface AttentionItem {
  id: string;
  severity: "critical" | "warning";
  kind: "integration" | "rejected_webhooks" | "job" | "outbox" | "company_suspended" | "company_past_due";
  title: string;
  detail: string;
  companyId?: string;
}

export type JobState = "running" | "failed" | "stale" | "never" | "ok";

export interface JobsOverview {
  jobs: { job: string; schedule: string; status: JobState; lastRunAt: string | null; lastSuccessAt: string | null; lastError: string | null }[];
  recentFailures: { id: string; job: string; startedAt: string; error: string | null }[];
  outbox: { pending: number; stuck: number; oldestAt: string | null; lastError: string | null };
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

// ---------- Hooks ----------
// These call the control API and nothing else. A failed request is an error the page shows; it is never
// replaced by made-up data, because staff would act on it as if it were true.

function listParams(values: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") q.set(key, String(value));
  }
  return q.toString();
}

export function useControlStats() {
  return useQuery({
    queryKey: ["control", "stats"],
    queryFn: () => apiRequest<ControlStats>("GET", "/control/stats"),
    refetchInterval: 30_000,
  });
}

export function useControlCompanies(params: { page?: number; pageSize?: number; search?: string; status?: string }) {
  const { page = 1, pageSize = 20, search = "", status = "" } = params;
  return useQuery({
    queryKey: ["control", "companies", page, pageSize, search, status],
    queryFn: () => apiRequest<Paginated<ControlCompany>>("GET", `/control/companies?${listParams({ page, pageSize, search, status })}`),
  });
}

export function useControlCompany(id: string) {
  return useQuery({
    queryKey: ["control", "company", id],
    queryFn: () => apiRequest<ControlCompany>("GET", `/control/companies/${id}`),
    enabled: !!id,
  });
}

export function useControlStations(params: { page?: number; pageSize?: number; search?: string; companyId?: string } = {}) {
  const { page = 1, pageSize = 20, search = "", companyId = "" } = params;
  return useQuery({
    queryKey: ["control", "stations", page, pageSize, search, companyId],
    queryFn: () => apiRequest<Paginated<ControlStation>>("GET", `/control/stations?${listParams({ page, pageSize, search, companyId })}`),
  });
}

export function useControlUsers(params: { page?: number; pageSize?: number; search?: string; companyId?: string; status?: string } = {}) {
  const { page = 1, pageSize = 20, search = "", companyId = "", status = "" } = params;
  return useQuery({
    queryKey: ["control", "users", page, pageSize, search, companyId, status],
    queryFn: () => apiRequest<Paginated<ControlUser>>("GET", `/control/users?${listParams({ page, pageSize, search, companyId, status })}`),
  });
}

export interface ActivityFilters {
  page?: number;
  pageSize?: number;
  companyId?: string;
  search?: string;
  /** Action name prefix, e.g. "company." */
  action?: string;
  actorId?: string;
  resourceType?: string;
}

export function useControlActivity(filters: ActivityFilters = {}) {
  const { page = 1, pageSize = 20, ...rest } = filters;
  return useQuery({
    queryKey: ["control", "activity", page, pageSize, rest],
    queryFn: () => apiRequest<Paginated<ControlActivity>>("GET", `/control/activity?${listParams({ page, pageSize, ...rest })}`),
  });
}

export function useControlAuditLogs(filters: ActivityFilters = {}) {
  const { page = 1, pageSize = 20, ...rest } = filters;
  return useQuery({
    queryKey: ["control", "audit-logs", page, pageSize, rest],
    queryFn: () => apiRequest<Paginated<ControlActivity>>("GET", `/control/audit-logs?${listParams({ page, pageSize, ...rest })}`),
  });
}

export function useControlIntegrations() {
  return useQuery({
    queryKey: ["control", "integrations"],
    queryFn: async () => extractArray<IntegrationHealth>(await apiRequest<{ data: IntegrationHealth[] } | IntegrationHealth[]>("GET", "/control/integrations"), "integrations"),
  });
}

export function useControlAttention() {
  return useQuery({
    queryKey: ["control", "attention"],
    queryFn: async () => (await apiRequest<{ data: AttentionItem[] }>("GET", "/control/attention")).data,
    refetchInterval: 60_000,
  });
}

export function useControlJobs() {
  return useQuery({
    queryKey: ["control", "jobs"],
    queryFn: () => apiRequest<JobsOverview>("GET", "/control/jobs"),
    refetchInterval: 60_000,
  });
}

export function useControlFeatureFlags() {
  return useQuery({
    queryKey: ["control", "feature-flags"],
    queryFn: async () => extractArray<FeatureFlag>(await apiRequest<{ data: FeatureFlag[] } | FeatureFlag[]>("GET", "/control/feature-flags")),
  });
}

export function useControlPlans() {
  return useQuery({
    queryKey: ["control", "plans"],
    queryFn: async () => extractArray<Plan>(await apiRequest<{ data: Plan[] } | Plan[]>("GET", "/control/plans")),
  });
}

export interface SearchResult {
  type: string;
  id: string;
  label: string;
  subtitle?: string;
  url: string;
}

export function useControlSearch(q: string) {
  return useQuery({
    queryKey: ["control", "search", q],
    queryFn: () => apiRequest<SearchResult[]>("GET", `/control/search?q=${encodeURIComponent(q.trim())}`),
    enabled: q.trim().length >= 2,
  });
}

// ---------- Mutations ----------
// Every write carries the reason the operator gave; the API refuses a missing one and records it in the audit trail.

export function useSuspendCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => apiRequest("POST", `/control/companies/${id}/suspend`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

export function useUnsuspendCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => apiRequest("POST", `/control/companies/${id}/unsuspend`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

export interface AccessFinding {
  code: string;
  severity: "blocking" | "warning" | "info";
  title: string;
  detail: string;
  /** The support action that resolves it, when there is one. */
  action?: "user.unlock" | "user.sendReset" | "user.reactivate" | "invite.resend";
}

export interface UserAccess {
  user: { id: string; name: string; email: string; phone: string | null; status: "active" | "suspended"; isOwner: boolean; roleName: string; stationName: string | null; companyId: string; companyName: string; createdAt: string };
  signIn: { hasLogin: boolean; lastLoginAt: string | null; passwordUpdatedAt: string | null; failedAttempts: number; lockedUntil: string | null };
  invite: { id: string; status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"; expiresAt: string; createdAt: string } | null;
  canSignIn: boolean;
  findings: AccessFinding[];
  recentActivity: { id: string; action: string; label: string | null; createdAt: string }[];
}

export interface ControlInvite {
  id: string;
  email: string;
  companyId: string;
  companyName: string;
  roleName: string;
  stationName: string | null;
  status: "pending" | "expired" | "accepted" | "revoked";
  expiresAt: string;
  createdAt: string;
}

export function useUserAccess(id: string | undefined) {
  return useQuery({
    queryKey: ["control", "user-access", id],
    queryFn: () => apiRequest<UserAccess>("GET", `/control/users/${id}/access`),
    enabled: !!id,
  });
}

export type UserActionName = "unlock" | "send-reset" | "reactivate" | "suspend";

export function useUserAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: UserActionName; reason: string }) => apiRequest<{ ok: true }>("POST", `/control/users/${id}/${action}`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

export function useControlInvites(params: { page?: number; pageSize?: number; status?: string; companyId?: string; search?: string } = {}) {
  const { page = 1, pageSize = 20, status = "", companyId = "", search = "" } = params;
  return useQuery({
    queryKey: ["control", "invites", page, pageSize, status, companyId, search],
    queryFn: () => apiRequest<Paginated<ControlInvite>>("GET", `/control/invites?${listParams({ page, pageSize, status, companyId, search })}`),
  });
}

export function useInviteAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: "resend" | "revoke"; reason: string }) =>
      apiRequest<{ ok: true; emailSent?: boolean }>("POST", `/control/invites/${id}/${action}`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

export interface ControlOrderRow {
  id: string;
  orderNumber: number;
  companyId: string;
  companyName: string;
  stationName: string;
  customerName: string | null;
  customerPhone: string | null;
  type: string;
  channel: string;
  status: string;
  paymentStatus: string;
  total: string;
  deleted: boolean;
  createdAt: string;
}

export interface ControlOrder {
  id: string;
  orderNumber: number;
  companyId: string;
  companyName: string;
  stationName: string;
  customer: { id: string; name: string; phone: string | null } | null;
  type: string;
  channel: string;
  status: string;
  paymentStatus: string;
  subtotal: string;
  discount: string;
  vatAmount: string;
  total: string;
  paidTotal: string;
  refundedTotal: string;
  balanceDue: string;
  notes: string | null;
  deletedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  invoice: { invoiceNumber: number; createdAt: string } | null;
  intake: { id: string; channel: string; source: string; customerPhone: string | null; messageText: string; status: string; createdAt: string } | null;
  deliveries: { id: string; status: string; createdAt: string }[];
  lines: { id: string; productName: string; quantity: string; unit: string; unitPrice: string; lineTotal: string }[];
  payments: { id: string; amount: string; method: string; reference: string | null; paidAt: string; recordedBy: string | null; pos: { id: string; provider: string; externalReference: string } | null }[];
  refunds: { id: string; amount: string; method: string; reason: string | null; createdAt: string }[];
  movements: { id: string; productName: string; quantity: string; type: string; createdAt: string }[];
  timeline: { id: string; action: string; actorName: string | null; createdAt: string }[];
}

export interface ControlPosTransaction {
  id: string;
  companyId: string;
  companyName: string;
  provider: string;
  externalReference: string;
  amount: string;
  fee: string | null;
  status: string;
  paidAt: string;
  matched: boolean;
  matchedOrderId: string | null;
  matchedOrderNumber: number | null;
  matchedAt: string | null;
}

export interface ControlMovement {
  id: string;
  companyId: string;
  companyName: string;
  stationName: string;
  productName: string;
  unit: string;
  quantity: string;
  type: string;
  orderId: string | null;
  orderNumber: number | null;
  note: string | null;
  createdAt: string;
}

export function useControlOrders(params: { page?: number; pageSize?: number; companyId?: string; status?: string; paymentStatus?: string; search?: string } = {}) {
  const { page = 1, pageSize = 20, ...rest } = params;
  return useQuery({
    queryKey: ["control", "orders", page, pageSize, rest],
    queryFn: () => apiRequest<Paginated<ControlOrderRow>>("GET", `/control/orders?${listParams({ page, pageSize, ...rest })}`),
  });
}

export function useControlOrder(id: string | undefined) {
  return useQuery({ queryKey: ["control", "order", id], queryFn: () => apiRequest<ControlOrder>("GET", `/control/orders/${id}`), enabled: !!id });
}

export function useControlPosTransactions(params: { page?: number; pageSize?: number; companyId?: string; matched?: string; status?: string } = {}) {
  const { page = 1, pageSize = 20, ...rest } = params;
  return useQuery({
    queryKey: ["control", "pos-transactions", page, pageSize, rest],
    queryFn: () => apiRequest<Paginated<ControlPosTransaction>>("GET", `/control/pos-transactions?${listParams({ page, pageSize, ...rest })}`),
  });
}

export function useControlMovements(params: { page?: number; pageSize?: number; companyId?: string; type?: string } = {}) {
  const { page = 1, pageSize = 20, ...rest } = params;
  return useQuery({
    queryKey: ["control", "movements", page, pageSize, rest],
    queryFn: () => apiRequest<Paginated<ControlMovement>>("GET", `/control/inventory-movements?${listParams({ page, pageSize, ...rest })}`),
  });
}

export function useRetryOutbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reason }: { reason: string }) => apiRequest<{ retried: number }>("POST", "/control/outbox/retry", { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled, scopeId, reason }: { key: string; enabled: boolean; scopeId: string; reason: string }) =>
      apiRequest("PUT", `/control/feature-flags/${key}`, { enabled, scopeType: "company", scopeId, reason }),
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
