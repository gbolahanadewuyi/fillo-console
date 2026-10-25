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
  totalUsers: number;
  activeUsers: number;
  /** Orders created since midnight in Lagos. */
  ordersToday: number;
  /** Payments recorded since midnight in Lagos, before refunds (exact decimal string). */
  paymentsToday: string;
  /** The last 14 Lagos days, oldest first, a zero where nothing was paid. */
  paymentsByDay: { date: string; payments: number }[];
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
  kind: "integration" | "rejected_webhooks" | "job" | "outbox" | "company_suspended" | "company_past_due" | "whatsapp_request";
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
  /** Where the API actually checks this feature. Empty: nothing reads it yet. */
  enforcedAt: string[];
  overrides: { scopeType: "platform" | "company" | "station"; scopeId: string; scopeLabel?: string; enabled: boolean }[];
}

export interface Plan {
  id: string;
  name: string;
  code: string;
  price: string;
  billingCycle: string;
  stationLimit: number | null;
  userLimit: number | null;
  featureCodes: string[];
  isActive: boolean;
  /** How many companies are on it. */
  companyCount: number;
  createdAt: string;
}

export type FeatureSource = "override" | "plan" | "unrestricted";

export interface CompanyBilling {
  subscriptionStatus: string;
  trialEndsAt: string | null;
  plan: { id: string; code: string; name: string } | null;
  usage: { stations: { used: number; limit: number | null }; users: { used: number; limit: number | null } };
  features: { key: string; label: string; enabled: boolean; source: FeatureSource; enforced: boolean }[];
  /** Only for roles that handle billing. */
  billing: { provider: string | null; customerId: string | null; subscriptionId: string | null } | null;
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

export function useControlCompanies(params: { page?: number; pageSize?: number; search?: string; status?: string; sort?: string }) {
  const { page = 1, pageSize = 20, search = "", status = "", sort = "" } = params;
  return useQuery({
    queryKey: ["control", "companies", page, pageSize, search, status, sort],
    queryFn: () => apiRequest<Paginated<ControlCompany>>("GET", `/control/companies?${listParams({ page, pageSize, search, status, sort })}`),
  });
}

export function useControlCompany(id: string) {
  return useQuery({
    queryKey: ["control", "company", id],
    queryFn: () => apiRequest<ControlCompany>("GET", `/control/companies/${id}`),
    enabled: !!id,
  });
}

export function useControlStations(params: { page?: number; pageSize?: number; search?: string; companyId?: string; sort?: string } = {}) {
  const { page = 1, pageSize = 20, search = "", companyId = "", sort = "" } = params;
  return useQuery({
    queryKey: ["control", "stations", page, pageSize, search, companyId, sort],
    queryFn: () => apiRequest<Paginated<ControlStation>>("GET", `/control/stations?${listParams({ page, pageSize, search, companyId, sort })}`),
  });
}

export function useControlUsers(params: { page?: number; pageSize?: number; search?: string; companyId?: string; status?: string; sort?: string } = {}) {
  const { page = 1, pageSize = 20, search = "", companyId = "", status = "", sort = "" } = params;
  return useQuery({
    queryKey: ["control", "users", page, pageSize, search, companyId, status, sort],
    queryFn: () => apiRequest<Paginated<ControlUser>>("GET", `/control/users?${listParams({ page, pageSize, search, companyId, status, sort })}`),
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

export function useControlInvites(params: { page?: number; pageSize?: number; status?: string; companyId?: string; search?: string; sort?: string } = {}) {
  const { page = 1, pageSize = 20, status = "", companyId = "", search = "", sort = "" } = params;
  return useQuery({
    queryKey: ["control", "invites", page, pageSize, status, companyId, search, sort],
    queryFn: () => apiRequest<Paginated<ControlInvite>>("GET", `/control/invites?${listParams({ page, pageSize, status, companyId, search, sort })}`),
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

export function useControlOrders(params: { page?: number; pageSize?: number; companyId?: string; status?: string; paymentStatus?: string; search?: string; sort?: string } = {}) {
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

export interface ControlCaseRow {
  id: string;
  title: string;
  status: "OPEN" | "RESOLVED";
  companyId: string;
  companyName: string;
  createdBy: string | null;
  noteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ControlCase {
  id: string;
  title: string;
  status: "OPEN" | "RESOLVED";
  companyId: string;
  companyName: string;
  user: { id: string; name: string | null; email: string | null } | null;
  order: { id: string; orderNumber: number | null } | null;
  posTransaction: { id: string; externalReference: string | null; provider: string | null } | null;
  createdBy: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  notes: { id: string; author: string | null; body: string; createdAt: string }[];
}

export function useControlCases(params: { page?: number; pageSize?: number; companyId?: string; status?: string; search?: string; sort?: string } = {}) {
  const { page = 1, pageSize = 20, ...rest } = params;
  return useQuery({
    queryKey: ["control", "cases", page, pageSize, rest],
    queryFn: () => apiRequest<Paginated<ControlCaseRow>>("GET", `/control/cases?${listParams({ page, pageSize, ...rest })}`),
  });
}

export function useControlCase(id: string | undefined) {
  return useQuery({ queryKey: ["control", "case", id], queryFn: () => apiRequest<ControlCase>("GET", `/control/cases/${id}`), enabled: !!id });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { companyId: string; title: string; userId?: string; orderId?: string; posTransactionId?: string; note?: string }) => apiRequest<ControlCase>("POST", "/control/cases", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control", "cases"] }),
  });
}

/** Add a note, or resolve / reopen (the note is optional there). Each answers with the whole case. */
export function useCaseAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, text }: { id: string; action: "note" | "resolve" | "reopen"; text?: string }) =>
      apiRequest<ControlCase>("POST", `/control/cases/${id}/${action === "note" ? "notes" : action}`, action === "note" ? { body: text } : text ? { note: text } : {}),
    onSuccess: (data) => {
      qc.setQueryData(["control", "case", data.id], data);
      void qc.invalidateQueries({ queryKey: ["control", "cases"] });
    },
  });
}

export type WhatsappStatus = "REQUESTED" | "NUMBER_ASSIGNED" | "PENDING_APPROVAL" | "LIVE" | "PAUSED";

export interface ControlWhatsappNumber {
  id: string;
  companyId: string;
  companyName: string;
  status: WhatsappStatus;
  /** Meta's id for the number (digits); empty until Fillo has assigned one. */
  phoneNumberId: string | null;
  /** The number customers dial. */
  displayPhoneNumber: string | null;
  requestedDisplayName: string | null;
  requestedContact: string | null;
  requestedAt: string | null;
  liveAt: string | null;
  /** What the company is told. */
  statusNote: string | null;
  ownToken: boolean;
  updatedAt: string;
}

export function useControlWhatsapp(params: { page?: number; pageSize?: number; status?: string } = {}) {
  const { page = 1, pageSize = 20, status = "" } = params;
  return useQuery({
    queryKey: ["control", "whatsapp", page, pageSize, status],
    queryFn: () => apiRequest<Paginated<ControlWhatsappNumber>>("GET", `/control/whatsapp-numbers?${listParams({ page, pageSize, status })}`),
  });
}

export interface WhatsappPatch {
  status?: Exclude<WhatsappStatus, "REQUESTED">;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  note?: string | null;
}

export function useUpdateWhatsapp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: WhatsappPatch }) => apiRequest<ControlWhatsappNumber>("PATCH", `/control/whatsapp-numbers/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

export function useRetryOutbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reason }: { reason: string }) => apiRequest<{ retried: number }>("POST", "/control/outbox/retry", { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

/** `enabled: null` removes the company's override, so it follows its plan again. */
export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled, scopeId, reason }: { key: string; enabled: boolean | null; scopeId: string; reason: string }) =>
      apiRequest("PUT", `/control/feature-flags/${key}`, { enabled, scopeType: "company", scopeId, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

export function useCompanyBilling(id: string) {
  return useQuery({ queryKey: ["control", "billing", id], queryFn: () => apiRequest<CompanyBilling>("GET", `/control/companies/${id}/billing`), enabled: !!id });
}

export function useAssignPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, planId, reason }: { companyId: string; planId: string | null; reason: string }) => apiRequest<CompanyBilling>("PUT", `/control/companies/${companyId}/plan`, { planId, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

export function useExtendTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, days, reason }: { companyId: string; days: number; reason: string }) => apiRequest<CompanyBilling>("POST", `/control/companies/${companyId}/trial`, { days, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

export interface PlanPatch {
  name?: string;
  price?: string;
  stationLimit?: number | null;
  userLimit?: number | null;
  featureCodes?: string[];
  isActive?: boolean;
}

export interface NewPlanInput {
  name: string;
  price: string;
  stationLimit: number | null;
  userLimit: number | null;
  featureCodes: string[];
  isActive: boolean;
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, reason }: { input: NewPlanInput; reason: string }) => apiRequest<Plan>("POST", "/control/plans", { ...input, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch, reason }: { id: string; patch: PlanPatch; reason: string }) => apiRequest<Plan>("PATCH", `/control/plans/${id}`, { ...patch, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control"] }),
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
