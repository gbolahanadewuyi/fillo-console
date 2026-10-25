import { useControlFeatureFlags } from "@/hooks/useControlApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/QueryError";

export default function FeatureFlags() {
  const { data, isLoading, error, refetch } = useControlFeatureFlags();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
        <p className="text-sm text-muted-foreground">
          Each feature, where the API checks it, and the companies with their own setting. The owner sets or removes a company's override from its Billing tab.
        </p>
      </div>
      {error ? (
        <QueryError error={error} onRetry={() => void refetch()} what="feature flags" />
      ) : isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid gap-4">
          {(data ?? []).map((flag) => (
            <Card key={flag.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {flag.label} <Badge variant="outline" className="font-mono text-xs">{flag.key}</Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {flag.description && <>{flag.description}. </>}
                  {flag.enforcedAt.length > 0 ? `Checked when: ${flag.enforcedAt.join(", ").toLowerCase()}.` : "Nothing in the apps uses this yet."}
                </CardDescription>
              </CardHeader>
              {flag.overrides.length > 0 && (
                <CardContent>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Overrides</div>
                  <div className="space-y-2">
                    {flag.overrides.map((o, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                        <span>
                          {o.scopeType} <span className="font-mono text-xs">{o.scopeId}</span> {o.scopeLabel ? `• ${o.scopeLabel}` : ""}
                        </span>
                        <Badge variant={o.enabled ? "default" : "outline"}>{o.enabled ? "Enabled" : "Disabled"}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
          {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No flags defined.</p>}
        </div>
      )}
    </div>
  );
}
