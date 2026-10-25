import { Link } from "react-router-dom";
import { useControlAttention, useControlIntegrations } from "@/hooks/useControlApi";
import { AttentionList, PLATFORM_KINDS } from "@/components/AttentionList";
import { JobsPanel } from "@/components/JobsPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { QueryError } from "@/components/QueryError";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lagos } from "@/lib/format";

/**
 * Is the platform itself healthy? What is failing in the plumbing (integrations, rejected webhooks, background jobs,
 * stuck events), separate from how the business is doing, which is the Dashboard.
 */
export default function Platform() {
  const { data: attention, error: attentionError } = useControlAttention();
  const { data: integrations, error: integrationsError } = useControlIntegrations();
  const unmonitored = integrations?.filter((i) => i.status === "unknown").length ?? 0;
  const failing = integrations?.filter((i) => i.status === "error" || i.status === "degraded").length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Platform health</h1>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Needs attention</h2>
        <Card>
          <CardContent className="pt-6">
            <AttentionList items={attention} error={attentionError} kinds={PLATFORM_KINDS} limit={10} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integrations</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {integrations ? `${integrations.length} connections, ${failing} failing` : "Integrations"}
            </CardTitle>
            <CardDescription>
              {unmonitored > 0 ? `${unmonitored} of ${integrations?.length ?? 0} had no activity in the last 7 days, so their health is unknown.` : "Based on the last 7 days of activity."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {integrationsError && <QueryError error={integrationsError} what="integrations" />}
            {(integrations ?? []).slice(0, 6).map((i) => (
              <div key={i.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium">
                    {i.provider} <span className="text-muted-foreground font-normal">• {i.companyName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {i.lastFailureAt && i.status !== "healthy"
                      ? `Failed ${lagos(i.lastFailureAt)}${i.lastFailureDetail ? `: ${i.lastFailureDetail}` : ""}`
                      : i.lastSuccessAt
                        ? `Worked ${lagos(i.lastSuccessAt)}`
                        : "No activity in the last 7 days"}
                  </div>
                </div>
                <StatusBadge status={i.status} />
              </div>
            ))}
            {!integrationsError && (integrations?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No integrations.</p>}
            <Link to="/integrations" className="text-xs text-primary hover:underline inline-block mt-2">
              All integrations →
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Background jobs</h2>
        <JobsPanel />
      </section>
    </div>
  );
}
