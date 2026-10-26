import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { lagos } from "@/lib/format";
import { useAssignPlan, useCompanyBilling, useControlPlans, useUpdateFeatureFlag, type CompanyBilling } from "@/hooks/useControlApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { QueryError } from "@/components/QueryError";
import { ConfirmWithReason } from "@/components/ConfirmWithReason";
import { ExtendTrialDialog } from "@/components/ExtendTrialDialog";

const NO_PLAN = "none";
const SOURCE = { override: "Set for this company", plan: "From the plan", unrestricted: "No plan: unrestricted" } as const;

const usage = (label: string, u: { used: number; limit: number | null }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium tabular-nums">{u.limit === null ? `${u.used} (no limit)` : `${u.used} of ${u.limit}`}</span>
  </div>
);

type Pending = { kind: "plan"; planId: string | null } | { kind: "flag"; key: string; label: string; enabled: boolean | null };

export function BillingPanel({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { user } = useAuth();
  const { data, error, refetch } = useCompanyBilling(companyId);
  const { data: plans } = useControlPlans();
  const assign = useAssignPlan();
  const flag = useUpdateFeatureFlag();
  const { toast } = useToast();
  const [chosen, setChosen] = useState<string | undefined>();
  const [pending, setPending] = useState<Pending | null>(null);
  const [extending, setExtending] = useState(false);
  const manage = can(user?.platformRole, "billing.manage");
  const owner = can(user?.platformRole, "flag.update");

  if (error) return <QueryError error={error} onRetry={() => void refetch()} what="billing" />;
  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const b: CompanyBilling = data;
  const current = b.plan?.id ?? NO_PLAN;
  const selected = chosen ?? current;
  const offered = (plans ?? []).filter((p) => p.isActive || p.id === b.plan?.id);

  async function confirm(reason: string) {
    if (!pending) return;
    if (pending.kind === "plan") {
      await assign.mutateAsync({ companyId, planId: pending.planId, reason });
      setChosen(undefined);
      toast({ title: pending.planId ? "Plan changed" : "Plan removed" });
    } else {
      await flag.mutateAsync({ key: pending.key, enabled: pending.enabled, scopeId: companyId, reason });
      toast({ title: pending.enabled === null ? "Override removed" : "Override saved" });
    }
  }

  const copy = !pending
    ? null
    : pending.kind === "plan"
      ? {
          title: pending.planId ? `Move ${companyName} to ${plans?.find((p) => p.id === pending.planId)?.name}` : `Remove ${companyName}'s plan`,
          description: pending.planId ? "Its limits and features change straight away. Anything already set up keeps working." : "With no plan nothing is limited or switched off.",
          confirm: pending.planId ? "Change plan" : "Remove plan",
        }
      : {
          title: pending.enabled === null ? `Remove the ${pending.label} override` : `Turn ${pending.label} ${pending.enabled ? "on" : "off"} for ${companyName}`,
          description: pending.enabled === null ? "The company follows its plan again." : "This beats whatever the plan says, until it is removed.",
          confirm: pending.enabled === null ? "Remove override" : "Save override",
        };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Subscription</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={b.subscriptionStatus.toLowerCase()} />
            </div>
            {b.subscriptionStatus === "TRIALING" && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Trial ends</span>
                <span className="font-medium">{lagos(b.trialEndsAt)}</span>
              </div>
            )}
            {manage && b.subscriptionStatus === "TRIALING" && (
              <Button size="sm" variant="outline" onClick={() => setExtending(true)}>Extend trial</Button>
            )}
            {b.billing && (
              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Provider</span><span>{b.billing.provider ?? "Not configured"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Customer</span><span className="font-mono text-xs">{b.billing.customerId ?? "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Subscription</span><span className="font-mono text-xs">{b.billing.subscriptionId ?? "—"}</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Plan and usage</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {manage ? (
              <div className="flex gap-2">
                <Select value={selected} onValueChange={setChosen}>
                  <SelectTrigger aria-label="Plan"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PLAN}>No plan (unrestricted)</SelectItem>
                    {offered.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={selected === current} onClick={() => setPending({ kind: "plan", planId: selected === NO_PLAN ? null : selected })}>Change</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{b.plan?.name ?? "No plan (unrestricted)"}</span>
              </div>
            )}
            {usage("Stations", b.usage.stations)}
            {usage("People (with pending invitations)", b.usage.users)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Features</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {b.features.map((f) => (
            <div key={f.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <div className="font-medium">{f.label}</div>
                <div className="text-xs text-muted-foreground">{f.enforced ? SOURCE[f.source] : "Nothing in the apps uses this yet"}</div>
              </div>
              <div className="flex items-center gap-2">
                {f.enforced ? (
                  <>
                    <StatusBadge status={f.enabled ? "enabled" : "disabled"} />
                    {owner && (
                      <>
                        <Button size="sm" variant="outline" aria-label={`Turn ${f.label} ${f.enabled ? "off" : "on"}`} onClick={() => setPending({ kind: "flag", key: f.key, label: f.label, enabled: !f.enabled })}>
                          {f.enabled ? "Turn off" : "Turn on"}
                        </Button>
                        {f.source === "override" && (
                          <Button size="sm" variant="ghost" aria-label={`Remove the ${f.label} override`} onClick={() => setPending({ kind: "flag", key: f.key, label: f.label, enabled: null })}>
                            Remove override
                          </Button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <span className="rounded border px-2 py-0.5 text-xs text-muted-foreground">Not available yet</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {copy && <ConfirmWithReason open onOpenChange={(open) => !open && setPending(null)} title={copy.title} description={copy.description} confirmLabel={copy.confirm} onConfirm={confirm} />}
      {extending && <ExtendTrialDialog companyId={companyId} companyName={companyName} onClose={() => setExtending(false)} />}
    </div>
  );
}
