import { useControlPlans } from "@/hooks/useControlApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QueryError } from "@/components/QueryError";

export default function Plans() {
  const { data, error, refetch } = useControlPlans();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plans & Billing</h1>
        <p className="text-sm text-muted-foreground">The plans Fillo offers. They are a reference list for now: companies are not linked to a plan and the limits are not enforced.</p>
      </div>
      {error && <QueryError error={error} onRetry={() => void refetch()} what="plans" />}
      <div className="grid gap-4 md:grid-cols-3">
        {(data ?? []).map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name} <Badge variant="outline" className="font-mono text-xs">{plan.code}</Badge>
              </CardTitle>
              <CardDescription>
                ₦{Number(plan.price).toLocaleString()} / {plan.billingCycle}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stations</span> <span className="font-medium">{plan.stationLimit ?? "∞"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Users</span> <span className="font-medium">{plan.userLimit ?? "∞"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Features</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {plan.featureCodes.map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
