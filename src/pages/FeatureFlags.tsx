import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { useControlFeatureFlags, useControlPlans, useSetFeatureLaunched, useUpdatePlan, type FeatureFlag, type Plan } from "@/hooks/useControlApi";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { QueryError } from "@/components/QueryError";
import { ConfirmWithReason } from "@/components/ConfirmWithReason";

type Pending = { kind: "plan"; flag: FeatureFlag; plan: Plan; include: boolean } | { kind: "launch"; flag: FeatureFlag; launched: boolean };

function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warn" | "ok" }) {
  const cls = tone === "ok" ? "border-green-600/30 bg-green-600/10 text-green-700" : tone === "warn" ? "border-amber-500/40 bg-amber-500/10 text-amber-700" : "text-muted-foreground";
  return <span className={`rounded border px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

/**
 * Every feature the API knows about, with whether it is built, launched and in which plans. New features appear here by themselves
 * (the list comes from the API's catalogue). Plans and launch are changed here, each with a reason; a single company's setting is
 * on its Billing tab.
 */
export default function FeatureFlags() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useControlFeatureFlags();
  const { data: plans } = useControlPlans();
  const updatePlan = useUpdatePlan();
  const launch = useSetFeatureLaunched();
  const { toast } = useToast();
  const [pending, setPending] = useState<Pending | null>(null);
  const managePlans = can(user?.platformRole, "billing.manage");
  const owner = can(user?.platformRole, "flag.update");

  async function confirm(reason: string) {
    if (!pending) return;
    if (pending.kind === "plan") {
      const current = plans?.find((p) => p.id === pending.plan.id)?.featureCodes ?? [];
      const next = pending.include ? [...new Set([...current, pending.flag.key])] : current.filter((k) => k !== pending.flag.key);
      await updatePlan.mutateAsync({ id: pending.plan.id, patch: { featureCodes: next }, reason });
      toast({ title: pending.include ? `Added to ${pending.plan.name}` : `Removed from ${pending.plan.name}` });
    } else {
      await launch.mutateAsync({ key: pending.flag.key, launched: pending.launched, reason });
      toast({ title: pending.launched ? `${pending.flag.label} launched` : `${pending.flag.label} taken back` });
    }
  }

  const copy = !pending
    ? null
    : pending.kind === "plan"
      ? {
          title: `${pending.include ? "Add" : "Remove"} ${pending.flag.label} ${pending.include ? "to" : "from"} ${pending.plan.name}?`,
          description: pending.include ? "Every company on this plan gets it straight away." : "Every company on this plan loses it straight away, unless it has its own setting.",
          confirm: pending.include ? "Add to plan" : "Remove from plan",
        }
      : {
          title: `${pending.launched ? "Launch" : "Take back"} ${pending.flag.label}?`,
          description: pending.launched ? "Every company with no plan gets it straight away. Companies on a plan still follow their plan." : "Companies with no plan lose it straight away. Plans and per-company settings are not changed.",
          confirm: pending.launched ? "Launch" : "Take back",
        };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
        <p className="text-sm text-muted-foreground">Each feature, whether it is built and launched, and which plans include it. A single company&apos;s setting is on its Billing tab.</p>
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
          {(data ?? []).map((flag) => {
            const built = flag.enforcedAt.length > 0;
            const inAPlan = flag.plans.some((p) => p.included);
            return (
              <Card key={flag.key}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                        {flag.label} <Badge variant="outline" className="font-mono text-xs">{flag.key}</Badge>
                        {!built && <Chip>Not available yet</Chip>}
                        {built && flag.gated && (flag.launched ? <Chip tone="ok">Launched</Chip> : <Chip tone="warn">Not launched</Chip>)}
                        {built && !inAPlan && <Chip tone="warn">Not in any plan</Chip>}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {flag.description && <>{flag.description}. </>}
                        {built ? `Checked when: ${flag.enforcedAt.join(", ").toLowerCase()}.` : "Nothing in the apps uses this yet."}
                      </CardDescription>
                    </div>
                    {flag.gated && owner && built && (
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={flag.launched} aria-label={`Launch ${flag.label}`} onCheckedChange={(on) => setPending({ kind: "launch", flag, launched: on })} />
                        Launch
                      </label>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {flag.plans.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plans</div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {flag.plans.map((p) => {
                          const full = plans?.find((x) => x.id === p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2 text-sm">
                              <Switch
                                checked={p.included}
                                disabled={!managePlans || !full || (!built && !p.included)}
                                aria-label={`${flag.label} in ${p.name}`}
                                onCheckedChange={(on) => full && setPending({ kind: "plan", flag, plan: full, include: on })}
                              />
                              <span className={p.isActive ? undefined : "text-muted-foreground"}>{p.name}{p.isActive ? "" : " (not offered)"}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {flag.overrides.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overrides</div>
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
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No flags defined.</p>}
        </div>
      )}
      {copy && <ConfirmWithReason open onOpenChange={(open) => !open && setPending(null)} title={copy.title} description={copy.description} confirmLabel={copy.confirm} onConfirm={confirm} />}
    </div>
  );
}
