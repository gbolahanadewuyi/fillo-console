import { useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useControlAttention, useControlOverview, type ControlOverview } from "@/hooks/useControlApi";
import { AttentionList, BUSINESS_KINDS } from "@/components/AttentionList";
import { QueryError } from "@/components/QueryError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { naira } from "@/lib/format";

const Section = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

function Stat({ to, label, value, children }: { to: string; label: string; value: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <Link to={to} className="block">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs uppercase tracking-wider">{label}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{children}</div>
        </CardContent>
      </Link>
    </Card>
  );
}

const change = (now: number, before: number) => (now === before ? "same as the 7 days before" : `${now > before ? "+" : "−"}${Math.abs(now - before)} on the 7 days before`);

function Adoption({ o }: { o: ControlOverview }) {
  const { organisations: org, adoption, people } = o;
  const part = (n: number, label: string, status: string) => (
    <Link key={status} to={`/companies?status=${status}`} className="hover:underline">
      {n} {label}
    </Link>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs uppercase tracking-wider">Organisations</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/companies" className="text-2xl font-bold tracking-tight hover:underline">
            {org.total}
          </Link>
          <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
            {part(org.active, "active", "active")}
            {part(org.trialing, "on trial", "trial")}
            {part(org.pastDue, "past due", "past_due")}
            {part(org.suspended, "suspended", "suspended")}
            {org.cancelled > 0 && part(org.cancelled, "cancelled", "canceled")}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            <Link to="/companies?sort=createdAt:desc" className="hover:underline">{adoption.newThisWeek} new this week</Link> · <Link to="/stations" className="hover:underline">{org.stations} stations</Link>
          </div>
        </CardContent>
      </Card>
      <Stat to="/orders" label="Active organisations" value={`${adoption.active7d} of ${org.total - org.cancelled}`}>
        Placed an order in the last 7 days
      </Stat>
      <Stat to="/users" label="People" value={people.active}>
        {people.signedIn7d} signed in this week · {people.addedThisWeek} added
      </Stat>
      <Stat to="/companies" label="At risk" value={adoption.atRisk}>
        No order in 14 days
      </Stat>
    </div>
  );
}

function Usage({ usage }: { usage: ControlOverview["usage"] }) {
  const [metric, setMetric] = useState<"orders" | "payments">("orders");
  const empty = usage.days.every((d) => d.orders === 0 && d.payments === 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat to="/orders" label="Orders placed" value={usage.orders7d}>
          Last 7 days, {change(usage.orders7d, usage.ordersPrev7d)}
        </Stat>
        <Stat to="/orders" label="Orders completed" value={usage.ordersCompleted7d}>
          Last 7 days, {change(usage.ordersCompleted7d, usage.ordersCompletedPrev7d)}
        </Stat>
        <Stat to="/orders" label="Deliveries completed" value={usage.deliveriesCompleted7d}>
          Last 7 days, {change(usage.deliveriesCompleted7d, usage.deliveriesCompletedPrev7d)}
        </Stat>
        <Stat to="/payments" label="Payments recorded" value={naira(usage.payments7d)}>
          Last 7 days, {change(usage.payments7d, usage.paymentsPrev7d)}
        </Stat>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Last 14 days</CardTitle>
              <CardDescription>
                What companies recorded in their own books, not Fillo&apos;s revenue. Lagos days. {usage.whatsappOrders7d} of the orders in the last 7 days came through WhatsApp.
              </CardDescription>
            </div>
            <div className="flex gap-1" role="group" aria-label="Chart metric">
              <Button size="sm" variant={metric === "orders" ? "default" : "outline"} aria-pressed={metric === "orders"} onClick={() => setMetric("orders")}>
                Orders
              </Button>
              <Button size="sm" variant={metric === "payments" ? "default" : "outline"} aria-pressed={metric === "payments"} onClick={() => setMetric("payments")}>
                Payments
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[220px]">
          {empty ? (
            <p className="text-sm text-muted-foreground">No orders or payments in the last 14 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usage.days}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} tickFormatter={(v: number) => (metric === "payments" ? `₦${(v / 1000).toFixed(0)}k` : String(v))} />
                <Tooltip formatter={(v: number) => [metric === "payments" ? naira(v) : v, metric === "payments" ? "Payments" : "Orders"]} />
                <Bar dataKey={metric} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * How Fillo is doing and what needs a person, for customers only. Fillo's own company and (unless asked) test companies are
 * left out, so test sales never look like customer activity. How the platform itself is doing (jobs, integrations, stuck events)
 * is the Platform health page, not here; a customer's own failing integration still shows as a line in Requires attention.
 */
export default function Dashboard() {
  const [includeTest, setIncludeTest] = useState(false);
  const { data: overview, isLoading, error, refetch } = useControlOverview(includeTest);
  const { data: attention, error: attentionError } = useControlAttention(includeTest);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={includeTest} onCheckedChange={setIncludeTest} aria-label="Include test companies" />
            <span>
              Include test companies
              {!includeTest && overview && overview.organisations.testExcluded > 0 && <span className="text-muted-foreground"> ({overview.organisations.testExcluded} hidden)</span>}
            </span>
          </label>
          <Link to="/activity" className="text-primary hover:underline">
            View activity →
          </Link>
        </div>
      </div>

      <Section title="Requires attention">
        <Card>
          <CardContent className="pt-6">
            <AttentionList items={attention} error={attentionError} kinds={[...BUSINESS_KINDS, "integration"]} empty="Nothing needs you." limit={10} />
          </CardContent>
        </Card>
      </Section>

      {error ? (
        <QueryError error={error} onRetry={() => void refetch()} what="the overview" />
      ) : isLoading || !overview ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Section title="Adoption">
            <Adoption o={overview} />
          </Section>
          <Section title="Usage">
            <Usage usage={overview.usage} />
          </Section>
        </>
      )}
    </div>
  );
}
