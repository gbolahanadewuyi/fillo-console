import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { useControlPlans, type Plan } from "@/hooks/useControlApi";
import { naira } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QueryError } from "@/components/QueryError";
import { PlanDialog } from "@/components/PlanDialog";

export default function Plans() {
  const { user } = useAuth();
  const { data, error, refetch } = useControlPlans();
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const manage = can(user?.platformRole, "billing.manage");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plans & Billing</h1>
          <p className="text-sm text-muted-foreground">A company on a plan is held to its limits and features. A company with no plan is unrestricted. Assign a plan from the company's Billing tab.</p>
        </div>
        {manage && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> New plan
          </Button>
        )}
      </div>
      {error && <QueryError error={error} onRetry={() => void refetch()} what="plans" />}
      <div className="grid gap-4 md:grid-cols-3">
        {(data ?? []).map((plan) => (
          <Card key={plan.id} className={plan.isActive ? undefined : "opacity-70"}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name} <Badge variant="outline" className="font-mono text-xs">{plan.code}</Badge>
              </CardTitle>
              <CardDescription>
                {naira(plan.price)} / {plan.billingCycle === "yearly" ? "year" : "month"}
                {!plan.isActive && " · not offered"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stations</span> <span className="font-medium">{plan.stationLimit ?? "No limit"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">People</span> <span className="font-medium">{plan.userLimit ?? "No limit"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Companies on it</span> <span className="font-medium">{plan.companyCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Includes</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {plan.featureCodes.length === 0 && <span className="text-xs text-muted-foreground">No extra features</span>}
                  {plan.featureCodes.map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
              {manage && (
                <Button size="sm" variant="outline" className="mt-2" aria-label={`Edit ${plan.name}`} onClick={() => setEditing(plan)}>
                  Edit
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {editing && <PlanDialog plan={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
