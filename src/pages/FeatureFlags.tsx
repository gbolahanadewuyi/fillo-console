import { useControlFeatureFlags, useUpdateFeatureFlag } from "@/hooks/useControlApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function FeatureFlags() {
  const { data, isLoading } = useControlFeatureFlags();
  const mut = useUpdateFeatureFlag();
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
        <p className="text-sm text-muted-foreground">Platform-level toggles. Enable per platform / company / station. UI must never hard-code availability.</p>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-4">
          {(data ?? []).map((flag) => (
            <Card key={flag.key}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {flag.label} <Badge variant="outline" className="font-mono text-xs">{flag.key}</Badge>
                    </CardTitle>
                    {flag.description && <CardDescription className="mt-1">{flag.description}</CardDescription>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`flag-${flag.key}`} className="text-sm text-muted-foreground">
                      Default
                    </Label>
                    <Switch
                      id={`flag-${flag.key}`}
                      checked={flag.enabledDefault}
                      disabled={mut.isPending}
                      onCheckedChange={async (v) => {
                        try {
                          await mut.mutateAsync({ key: flag.key, enabled: v });
                          toast({ title: "Updated", description: `${flag.key} default → ${v ? "enabled" : "disabled"}` });
                        } catch (e) {
                          toast({ title: "Failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" as never });
                        }
                      }}
                    />
                  </div>
                </div>
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
        </div>
      )}
      <p className="text-xs text-muted-foreground">Server resolves: station &gt; company &gt; platform default. Console must call PUT /control/feature-flags/:key with scopeType/scopeId to override.</p>
    </div>
  );
}
