import { useControlStats, useControlActivity, useControlAttention } from "@/hooks/useControlApi";
import { AttentionList, BUSINESS_KINDS } from "@/components/AttentionList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/QueryError";
import { lagos, naira } from "@/lib/format";
import { Building2, Store, Users, ShoppingCart, CreditCard } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

function Kpi({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wider">
          <Icon className="h-3.5 w-3.5" /> {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
    {children}
  </section>
);

/**
 * The business, and only the business: which customers need a look (suspended or overdue) and how they are doing.
 * Technical problems (integrations, jobs, stuck events) live on the Platform health page. Business numbers are for
 * customers (Fillo's own company is left out) and count Lagos days; each says what it counts.
 */
export default function Dashboard() {
  const { data: stats, isLoading, error: statsError, refetch: refetchStats } = useControlStats();
  const { data: activityPage, error: activityError } = useControlActivity({ pageSize: 8 });
  const { data: attention, error: attentionError } = useControlAttention();

  if (statsError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <QueryError error={statsError} onRetry={() => void refetchStats()} what="the overview" />
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const payments14 = stats.paymentsByDay.reduce((a, b) => a + b.payments, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <Section title="Needs attention">
        <Card>
          <CardContent className="pt-6">
            <AttentionList items={attention} error={attentionError} kinds={BUSINESS_KINDS} />
          </CardContent>
        </Card>
      </Section>

      <Section title="Business">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi icon={Building2} label="Companies" value={stats.totalCompanies} sub={`${stats.activeCompanies} active, ${stats.trialCompanies} on trial, ${stats.suspendedCompanies} suspended`} />
          <Kpi icon={Store} label="Stations" value={stats.totalStations} sub="Across all companies" />
          <Kpi icon={Users} label="People" value={stats.activeUsers} sub={`Active, of ${stats.totalUsers}`} />
          <Kpi icon={ShoppingCart} label="Orders today" value={stats.ordersToday} sub="Created since midnight in Lagos" />
          <Kpi icon={CreditCard} label="Payments today" value={naira(stats.paymentsToday)} sub="Recorded since midnight in Lagos" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Payments recorded, last 14 days: {naira(payments14)}</CardTitle>
              <CardDescription>Lagos days, before refunds, all companies.</CardDescription>
            </CardHeader>
            <CardContent className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.paymentsByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [naira(v), "Payments"]} />
                  <Area type="monotone" dataKey="payments" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activityError && <QueryError error={activityError} what="activity" />}
              {(activityPage?.data ?? []).slice(0, 6).map((a) => (
                <div key={a.id} className="text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="font-medium leading-none">{a.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.resourceLabel ?? a.resourceId} {a.companyName ? `• ${a.companyName}` : ""} • {lagos(a.createdAt)}
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
      </Section>
    </div>
  );
}
