import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useControlFeatureFlags, useCreatePlan, useUpdatePlan, type Plan, type PlanPatch } from "@/hooks/useControlApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/FieldError";
import { MIN_REASON_LENGTH } from "@/components/ConfirmWithReason";

const limit = z.string().trim().refine((v) => v === "" || /^[1-9]\d{0,5}$/.test(v), "A whole number, or leave empty for no limit");
const schema = z.object({
  name: z.string().trim().min(2, "Give the plan a name").max(60),
  price: z.string().trim().regex(/^\d{1,12}(\.\d{1,2})?$/, "An amount like 15000 or 15000.50"),
  stationLimit: limit,
  userLimit: limit,
  reason: z.string().trim().min(MIN_REASON_LENGTH, `Give a reason of at least ${MIN_REASON_LENGTH} characters`).max(500),
});
type Values = z.infer<typeof schema>;

const toLimit = (v: string) => (v === "" ? null : Number(v));
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Make a plan or change one: a name, a price, two limits, and a switch for everything it includes. With `plan` it
 * edits (only what changed is sent); without, it creates. The reason is kept in the audit trail.
 */
export function PlanDialog({ plan, onClose }: { plan?: Plan; onClose: () => void }) {
  const creating = !plan;
  const update = useUpdatePlan();
  const create = useCreatePlan();
  const pending = update.isPending || create.isPending;
  const { data: catalogue } = useControlFeatureFlags();
  const [features, setFeatures] = useState<string[]>(plan?.featureCodes ?? []);
  const [active, setActive] = useState(plan?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: plan?.name ?? "",
      price: plan ? String(Number(plan.price)) : "",
      stationLimit: plan?.stationLimit?.toString() ?? "",
      userLimit: plan?.userLimit?.toString() ?? "",
      reason: "",
    },
  });
  const v = watch();

  const patch: PlanPatch = {};
  if (plan) {
    if (v.name?.trim() !== plan.name) patch.name = v.name?.trim();
    if (v.price?.trim() !== String(Number(plan.price))) patch.price = v.price?.trim();
    if (toLimit(v.stationLimit ?? "") !== plan.stationLimit) patch.stationLimit = toLimit(v.stationLimit ?? "");
    if (toLimit(v.userLimit ?? "") !== plan.userLimit) patch.userLimit = toLimit(v.userLimit ?? "");
    if (!same(features, plan.featureCodes)) patch.featureCodes = features;
    if (active !== plan.isActive) patch.isActive = active;
  }
  const changed = creating || Object.keys(patch).length > 0;

  const toggle = (key: string, on: boolean) => setFeatures((cur) => (on ? [...cur, key] : cur.filter((k) => k !== key)));

  async function submit(values: Values) {
    setError(null);
    try {
      if (plan) await update.mutateAsync({ id: plan.id, patch, reason: values.reason });
      else await create.mutateAsync({ input: { name: values.name, price: values.price, stationLimit: toLimit(values.stationLimit), userLimit: toLimit(values.userLimit), featureCodes: features, isActive: active }, reason: values.reason });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The plan could not be saved.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? `Edit ${plan.name}` : "New plan"}</DialogTitle>
        </DialogHeader>
        <form id="plan-form" onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input id="plan-name" autoFocus={creating} aria-invalid={!!errors.name} {...register("name")} />
              <FieldError id="plan-name-error" message={errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-price">Price (₦ a month)</Label>
              <Input id="plan-price" inputMode="decimal" aria-invalid={!!errors.price} {...register("price")} />
              <FieldError id="plan-price-error" message={errors.price?.message} />
            </div>
            <div />
            <div className="space-y-2">
              <Label htmlFor="plan-stations">Station limit</Label>
              <Input id="plan-stations" inputMode="numeric" placeholder="No limit" aria-invalid={!!errors.stationLimit} {...register("stationLimit")} />
              <FieldError id="plan-stations-error" message={errors.stationLimit?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-users">People limit</Label>
              <Input id="plan-users" inputMode="numeric" placeholder="No limit" aria-invalid={!!errors.userLimit} {...register("userLimit")} />
              <FieldError id="plan-users-error" message={errors.userLimit?.message} />
            </div>
          </div>

          <fieldset className="space-y-1">
            <legend className="mb-1 text-sm font-medium">Included in this plan</legend>
            <div className="divide-y rounded-md border">
              {(catalogue ?? []).map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div>
                    <div className="text-sm">{f.label}</div>
                    {f.enforcedAt.length === 0 && <div className="text-xs text-muted-foreground">Not used by the apps yet</div>}
                  </div>
                  <Switch aria-label={f.label} checked={features.includes(f.key)} onCheckedChange={(on) => toggle(f.key, on)} />
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <div className="text-sm">Offered</div>
                  <div className="text-xs text-muted-foreground">Off: it can no longer be given to a company; companies on it keep it</div>
                </div>
                <Switch aria-label="Offered" checked={active} onCheckedChange={setActive} />
              </div>
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="plan-reason">Reason (kept in the audit trail)</Label>
            <Textarea id="plan-reason" rows={2} maxLength={500} aria-invalid={!!errors.reason} {...register("reason")} />
            <FieldError id="plan-reason-error" message={errors.reason?.message} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" form="plan-form" disabled={!changed || pending}>{pending ? "Saving…" : creating ? "Create plan" : "Save plan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
