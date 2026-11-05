import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useCheckSlug, useControlPlans, useCreateCompany, type CreatedCompany } from "@/hooks/useControlApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldError } from "@/components/FieldError";
import { MIN_REASON_LENGTH } from "@/components/ConfirmWithReason";

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
export const slugFromName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");

const schema = z.object({
  name: z.string().trim().min(2, "Enter the company's name"),
  slug: z.string().trim().toLowerCase().regex(SLUG, "Use lowercase letters, numbers and hyphens (at most 32)"),
  mode: z.enum(["RETAIL", "DEPOT"]),
  planId: z.string().min(1, "Choose a plan"),
  startAs: z.enum(["TRIAL", "ACTIVE"]),
  trialDays: z.string().regex(/^\d{1,2}$/, "Whole days, 1 to 90"),
  ownerName: z.string().trim().min(2, "Enter the owner's name"),
  ownerEmail: z.string().trim().email("Enter a valid email"),
  standardRoles: z.boolean(),
  reason: z.string().trim().min(MIN_REASON_LENGTH, `Give a reason of at least ${MIN_REASON_LENGTH} characters`),
});
type Values = z.infer<typeof schema>;

const REASONS: Record<string, string> = { taken: "That address is already used by another company.", reserved: "That address is reserved for Fillo's own sites.", invalid: "Not a valid address." };

/** Staff create a client company: its address, business type, plan and the owner who is invited by email. */
export function NewCompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const create = useCreateCompany();
  const { data: plans } = useControlPlans();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CreatedCompany | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", mode: "RETAIL", planId: "", startAs: "TRIAL", trialDays: "30", ownerName: "", ownerEmail: "", standardRoles: true, reason: "" },
  });
  const name = watch("name");
  const slug = watch("slug");
  const startAs = watch("startAs");
  const debouncedSlug = useDebouncedValue(SLUG.test(slug.trim().toLowerCase()) ? slug.trim().toLowerCase() : "", 300);
  const { data: availability } = useCheckSlug(debouncedSlug);

  // Suggest an address from the name until staff type their own.
  useEffect(() => {
    if (!slugEdited) setValue("slug", slugFromName(name), { shouldValidate: name.length > 0 });
  }, [name, slugEdited, setValue]);

  function close(next: boolean) {
    if (create.isPending) return;
    if (!next) {
      reset();
      setError(null);
      setDone(null);
      setSlugEdited(false);
    }
    onOpenChange(next);
  }

  async function submit(v: Values) {
    setError(null);
    if (availability && "reason" in availability && debouncedSlug === v.slug.trim().toLowerCase()) {
      setError(REASONS[availability.reason] ?? "That address cannot be used.");
      return;
    }
    try {
      setDone(
        await create.mutateAsync({
          name: v.name.trim(),
          slug: v.slug.trim().toLowerCase(),
          mode: v.mode,
          planId: v.planId,
          startAs: v.startAs,
          trialDays: v.startAs === "TRIAL" ? Number(v.trialDays) : undefined,
          owner: { name: v.ownerName.trim(), email: v.ownerEmail.trim().toLowerCase() },
          standardRoles: v.standardRoles,
          reason: v.reason.trim(),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "The company could not be created.");
    }
  }

  if (done) {
    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{done.company.name} is set up</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>{done.invite.emailSent ? `An invitation went to ${done.invite.email}.` : `The invitation to ${done.invite.email} could not be emailed. Resend it from the company's People tab.`}</p>
            <p>The company's address is <span className="font-medium">{done.address}</span>. It will not open until the address is added in GoDaddy and Coolify. The company page has the steps and a check.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>Close</Button>
            <Button onClick={() => { close(false); navigate(`/companies/${done.company.id}?tab=branding`); }}>Open the company</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const slugState = !debouncedSlug ? null : availability ? ("reason" in availability ? availability.reason : "free") : "checking";
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New company</DialogTitle>
        </DialogHeader>
        <form id="new-company" onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nc-name">Company name</Label>
            <Input id="nc-name" autoFocus aria-invalid={!!errors.name} {...register("name")} />
            <FieldError id="nc-name-error" message={errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nc-slug">Address</Label>
            <div className="flex items-center gap-2">
              <Input id="nc-slug" aria-invalid={!!errors.slug} {...register("slug", { onChange: () => setSlugEdited(true) })} />
              <span className="shrink-0 text-sm text-muted-foreground">.fillo.cloud</span>
            </div>
            {slugState === "free" && <p className="text-xs text-green-600">{slug.trim().toLowerCase()}.fillo.cloud is free.</p>}
            {slugState === "checking" && <p className="text-xs text-muted-foreground">Checking…</p>}
            {slugState && slugState !== "free" && slugState !== "checking" && <p className="text-xs text-destructive">{REASONS[slugState]}</p>}
            <FieldError id="nc-slug-error" message={errors.slug?.message} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nc-mode">Business type</Label>
              <Select value={watch("mode")} onValueChange={(v) => setValue("mode", v as "RETAIL" | "DEPOT")}>
                <SelectTrigger id="nc-mode" aria-label="Business type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETAIL">Retail (till, plant)</SelectItem>
                  <SelectItem value="DEPOT">Depot (tanks, loading)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-plan">Plan</Label>
              <Select value={watch("planId")} onValueChange={(v) => setValue("planId", v, { shouldValidate: true })}>
                <SelectTrigger id="nc-plan" aria-label="Plan"><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>
                  {(plans ?? []).filter((p) => p.isActive !== false).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError id="nc-plan-error" message={errors.planId?.message} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nc-start">Starts as</Label>
              <Select value={startAs} onValueChange={(v) => setValue("startAs", v as "TRIAL" | "ACTIVE")}>
                <SelectTrigger id="nc-start" aria-label="Starts as"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAL">A free trial</SelectItem>
                  <SelectItem value="ACTIVE">An active customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {startAs === "TRIAL" && (
              <div className="space-y-2">
                <Label htmlFor="nc-days">Trial length (days)</Label>
                <Input id="nc-days" inputMode="numeric" {...register("trialDays")} />
                <FieldError id="nc-days-error" message={errors.trialDays?.message} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nc-owner">Owner's name</Label>
              <Input id="nc-owner" autoComplete="off" aria-invalid={!!errors.ownerName} {...register("ownerName")} />
              <FieldError id="nc-owner-error" message={errors.ownerName?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-email">Owner's email</Label>
              <Input id="nc-email" type="email" autoComplete="off" aria-invalid={!!errors.ownerEmail} {...register("ownerEmail")} />
              <FieldError id="nc-email-error" message={errors.ownerEmail?.message} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="nc-roles" className="text-sm">Add Manager, Cashier and Attendant roles</Label>
            <Switch id="nc-roles" checked={watch("standardRoles")} onCheckedChange={(v) => setValue("standardRoles", v)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nc-reason">Reason</Label>
            <Input id="nc-reason" placeholder="e.g. Signed on 5 Nov" aria-invalid={!!errors.reason} {...register("reason")} />
            <FieldError id="nc-reason-error" message={errors.reason?.message} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
          <Button type="submit" form="new-company" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create company and invite owner"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
