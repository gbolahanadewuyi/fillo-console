import { useControlStats, useControlActivity, useControlIntegrations } from "@/hooks/useControlApi";
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

export default function Dashboard() {
  const { data: stats, isLoading, error: statsError, refetch: refetchStats } = useControlStats();
  const { data: activityPage, error: activityError } = useControlActivity({ pageSize: 8 });
  const { data: integrations, error: integrationsError } = useControlIntegrations();

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

  const failed = integrations?.filter((i) => i.status === "error" || i.status === "degraded") ?? [];
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
        <Kpi
          icon={Plug}
          label="Integrations"
          value={`${stats.activeIntegrations} connected`}
          sub={stats.failedIntegrations === null ? "Failures are not tracked yet" : `${stats.failedIntegrations} failing`}
        />
        <Kpi
          icon={AlertTriangle}
          label="Requires attention"
          value={stats.suspendedCompanies + failed.length}
          sub="Suspended companies and failing integrations"
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
              {unmonitored > 0 ? `${unmonitored} of ${integrations?.length ?? 0} have no health data yet.` : "WhatsApp, Moniepoint, OPay."}
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
                    {i.lastFailureAt ? `Failed ${new Date(i.lastFailureAt).toLocaleString()}` : i.lastSuccessAt ? `OK ${new Date(i.lastSuccessAt).toLocaleString()}` : "No events"}
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
            <CardTitle className="text-sm">Companies requiring attention</CardTitle>
            <CardDescription>Suspended companies and failing integrations.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.suspendedCompanies === 0 && failed.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is flagged.{unmonitored > 0 ? " Integration health is only partly known." : ""}</p>
            ) : (
              <div className="space-y-2 text-sm">
                {stats.suspendedCompanies > 0 && (
                  <div className="flex items-center justify-between">
                    <span>{stats.suspendedCompanies} suspended</span> <StatusBadge status="suspended" />
                  </div>
                )}
                {failed.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span>{failed.length} failing integration{failed.length === 1 ? "" : "s"}</span> <StatusBadge status="error" />
                  </div>
                )}
              </div>
            )}
            <Link to="/companies" className="text-xs text-primary hover:underline inline-block mt-3">
              Manage companies →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
