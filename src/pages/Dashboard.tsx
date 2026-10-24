import { useControlStats, useControlActivity, useControlIntegrations, useControlAttention, type AttentionItem } from "@/hooks/useControlApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/QueryError";
import { Building2, Store, Users, ShoppingCart, CreditCard, Plug, AlertTriangle, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

function Kpi({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wider">
          <Icon className="h-3.5 w-3.5" /> {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const body = (
    <div className="flex items-start gap-3 rounded border px-3 py-2">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.severity === "critical" ? "bg-red-500" : "bg-amber-500"}`} aria-label={item.severity} />
      <div className="min-w-0">
        <div className="text-sm font-medium leading-snug">{item.title}</div>
        <div className="text-xs text-muted-foreground break-words">{item.detail}</div>
      </div>
    </div>
  );
  const to = item.companyId ? `/companies/${item.companyId}` : item.kind === "job" || item.kind === "outbox" || item.kind === "integration" || item.kind === "rejected_webhooks" ? "/integrations" : undefined;
  return to ? (
    <Link to={to} className="block hover:bg-muted/50 rounded">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, error: statsError, refetch: refetchStats } = useControlStats();
  const { data: activityPage, error: activityError } = useControlActivity({ pageSize: 8 });
  const { data: integrations, error: integrationsError } = useControlIntegrations();
  const { data: attention, error: attentionError } = useControlAttention();

  if (statsError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <QueryError error={statsError} onRetry={() => void refetchStats()} what="the platform summary" />
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const unmonitored = integrations?.filter((i) => i.status === "unknown").length ?? 0;
  const revenue14 = stats.revenue30d.reduce((a, b) => a + b.revenue, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">What is happening across Fillo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Building2} label="Companies" value={stats.totalCompanies} sub={`${stats.activeCompanies} active • ${stats.trialCompanies} trial`} />
        <Kpi icon={Store} label="Active stations" value={stats.activeStations} sub={`${stats.totalStations} total`} />
        <Kpi icon={Users} label="Active users" value={stats.activeUsers} sub={`${stats.totalUsers} total`} />
        <Kpi icon={ShoppingCart} label="Orders today" value={stats.ordersToday} sub="Across all companies" />
        <Kpi icon={CreditCard} label="Revenue today" value={`₦${Number(stats.revenueToday).toLocaleString()}`} sub="Payments recorded today" />
        <Kpi icon={Plug} label="Integrations" value={`${stats.activeIntegrations} connected`} sub={`${stats.failedIntegrations} failing`} />
        <Kpi
          icon={AlertTriangle}
          label="Needs attention"
          value={attentionError ? "—" : (attention?.length ?? "…")}
          sub={attentionError ? "Couldn't load the list" : (attention ?? []).some((i) => i.severity === "critical") ? "Something is failing" : "Nothing failing"}
        />
                <Kpi icon={TrendingUp} label="14-day payments" value={`₦${revenue14.toLocaleString()}`} sub="Payments recorded, last 14 days" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Payments recorded, last 14 days</CardTitle>
            <CardDescription>Sum of payments recorded across all tenants.</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenue30d}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`₦${v.toLocaleString()}`, "Payments"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent activity</CardTitle>
            <CardDescription>Platform-level audit feed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityError && <QueryError error={activityError} what="activity" />}
            {(activityPage?.data ?? []).slice(0, 6).map((a) => (
              <div key={a.id} className="text-sm border-b last:border-0 pb-2 last:pb-0">
                <div className="font-medium leading-none">{a.action}</div>
                <div className="text-xs text-muted-foreground">
                  {a.resourceLabel ?? a.resourceId} {a.companyName ? `• ${a.companyName}` : ""} • {new Date(a.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {!activityError && (activityPage?.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
            <Link to="/activity" className="text-xs text-primary hover:underline inline-block mt-2">
              View activity →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Integration health</CardTitle>
            <CardDescription>
              {unmonitored > 0 ? `${unmonitored} of ${integrations?.length ?? 0} had no activity in the last 7 days, so their health is unknown.` : "Based on the last 7 days of activity."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {integrationsError && <QueryError error={integrationsError} what="integrations" />}
            {(integrations ?? []).slice(0, 5).map((i) => (
              <div key={i.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium">
                    {i.provider} <span className="text-muted-foreground font-normal">• {i.companyName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {i.lastFailureAt && i.status !== "healthy"
                      ? `Failed ${new Date(i.lastFailureAt).toLocaleString()}${i.lastFailureDetail ? `: ${i.lastFailureDetail}` : ""}`
                      : i.lastSuccessAt
                        ? `Worked ${new Date(i.lastSuccessAt).toLocaleString()}`
                        : "No activity in the last 7 days"}
                  </div>
                </div>
                <StatusBadge status={i.status} />
              </div>
            ))}
            {!integrationsError && (integrations?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No integrations.</p>}
            <Link to="/integrations" className="text-xs text-primary hover:underline inline-block mt-2">
              View integrations →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Needs attention</CardTitle>
            <CardDescription>Failing integrations and jobs, stuck events, and companies that are suspended or overdue. Worst first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {attentionError ? (
              <QueryError error={attentionError} what="the attention list" />
            ) : attention === undefined ? (
              <Skeleton className="h-16 w-full" />
            ) : attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is flagged.</p>
            ) : (
              attention.slice(0, 8).map((item) => <AttentionRow key={item.id} item={item} />)
            )}
            {(attention?.length ?? 0) > 8 && <p className="text-xs text-muted-foreground">and {(attention?.length ?? 0) - 8} more</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
