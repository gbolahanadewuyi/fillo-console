import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { ImagePlus } from "lucide-react";
import { useCheckSlug, useControlPlans, useCreateCompany, useUpdateCompanyBranding, type CreatedCompany } from "@/hooks/useControlApi";
import { RoleFields, draftPayload, draftProblem, emptyDraft, type RoleDraft } from "@/components/RoleFields";
import { LOGO_TYPES, logoProblem, readAsDataUrl } from "@/lib/logo";
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
  stationName: z.string().trim().max(80),
  standardRoles: z.boolean(),
  reason: z.string().trim().min(MIN_REASON_LENGTH, `Give a reason of at least ${MIN_REASON_LENGTH} characters`),
});
type Values = z.infer<typeof schema>;

const DEFAULT_PRIMARY = "#1B6EF3";
const DEFAULT_SECONDARY = "#0B1B2A";
const HEX = /^#[0-9A-Fa-f]{6}$/;

const REASONS: Record<string, string> = { taken: "That address is already used by another company.", reserved: "That address is reserved for Fillo's own sites.", invalid: "Not a valid address." };

/** Staff create a client company: its address, business type, plan and the owner who is invited by email. */
export function NewCompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const create = useCreateCompany();
  const branding = useUpdateCompanyBranding();
  const { data: plans } = useControlPlans();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CreatedCompany | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSaved, setLogoSaved] = useState(true);
  // null = left as the default, so nothing is sent unless staff choose a colour.
  const [roles, setRoles] = useState<RoleDraft[]>([]);
  // The role being written in the small dialog: its place in the list (null = a new one) and its text.
  const [editing, setEditing] = useState<{ index: number | null; draft: RoleDraft } | null>(null);
  const [primary, setPrimary] = useState<string | null>(null);
  const [secondary, setSecondary] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", mode: "RETAIL", planId: "", startAs: "TRIAL", trialDays: "30", ownerName: "", ownerEmail: "", stationName: "", standardRoles: true, reason: "" },
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
    if (create.isPending || branding.isPending) return;
    if (!next) {
      reset();
      setError(null);
      setDone(null);
      setSlugEdited(false);
      setLogo(null);
      setLogoError(null);
      setLogoSaved(true);
      setPrimary(null);
      setSecondary(null);
      setRoles([]);
      setEditing(null);
    }
    onOpenChange(next);
  }

  async function chooseLogo(file: File | undefined) {
    setLogoError(null);
    setLogo(null);
    if (!file) return;
    const problem = logoProblem(file);
    if (problem) return setLogoError(problem);
    try {
      setLogo(await readAsDataUrl(file));
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Could not read that file.");
    }
  }

  async function submit(v: Values) {
    setError(null);
    if (availability && "reason" in availability && debouncedSlug === v.slug.trim().toLowerCase()) {
      setError(REASONS[availability.reason] ?? "That address cannot be used.");
      return;
    }
    try {
      const created = await create.mutateAsync({
          name: v.name.trim(),
          slug: v.slug.trim().toLowerCase(),
          mode: v.mode,
          planId: v.planId,
          startAs: v.startAs,
          trialDays: v.startAs === "TRIAL" ? Number(v.trialDays) : undefined,
          owner: { name: v.ownerName.trim(), email: v.ownerEmail.trim().toLowerCase() },
          standardRoles: v.standardRoles,
          roles: roles.map(draftPayload),
          ...(v.stationName.trim() ? { stationName: v.stationName.trim() } : {}),
          reason: v.reason.trim(),
        });
      // The logo goes up right after the company exists, so the owner's link shows it from the first visit.
      let saved = true;
      const payload = { ...(logo ? { logoUrl: logo } : {}), ...(primary && HEX.test(primary) ? { primaryColor: primary } : {}), ...(secondary && HEX.test(secondary) ? { secondaryColor: secondary } : {}) };
      if (Object.keys(payload).length > 0) {
        try {
          await branding.mutateAsync({ id: created.company.id, payload });
        } catch {
          saved = false;
        }
      }
      setLogoSaved(saved);
      setDone(created);
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
            {!logoSaved && <p className="text-destructive">The logo and colours could not be saved. Add them again from the company's Branding tab.</p>}
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
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>New company</DialogTitle>
        </DialogHeader>
        <form id="new-company" onSubmit={handleSubmit(submit)} noValidate className="space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</h3>
            <div className="flex items-start gap-4">
              <label htmlFor="nc-logo" className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
                {logo ? <img src={logo} alt="Chosen logo" className="h-full w-full object-contain p-1" /> : <><ImagePlus className="h-5 w-5" aria-hidden /><span>Logo</span></>}
                <input id="nc-logo" type="file" accept={LOGO_TYPES.join(",")} className="sr-only" aria-describedby="nc-logo-error" onChange={(e) => void chooseLogo(e.target.files?.[0])} />
              </label>
              <div className="grid flex-1 gap-4">
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
              </div>
            </div>
            <FieldError id="nc-logo-error" message={logoError ?? undefined} />
            <div className="space-y-2">
              <Label htmlFor="nc-station">Station name (optional)</Label>
              <Input id="nc-station" placeholder="Main Station" {...register("stationName")} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {([["nc-primary", "Brand colour", primary, setPrimary, DEFAULT_PRIMARY], ["nc-secondary", "Second colour", secondary, setSecondary, DEFAULT_SECONDARY]] as const).map(([id, label, value, set, fallback]) => (
                <div key={id} className="space-y-2">
                  <Label htmlFor={id}>{label}</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" aria-label={`${label} picker`} value={value && HEX.test(value) ? value : fallback} onChange={(e) => set(e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded border bg-transparent p-1" />
                    <Input id={id} value={value ?? ""} placeholder={fallback} aria-invalid={!!value && !HEX.test(value)} onChange={(e) => set(e.target.value.trim() || null)} />
                  </div>
                  {value && !HEX.test(value) && <p className="text-xs text-destructive">Use a hex colour like {fallback}.</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            </div>
            {startAs === "TRIAL" && (
              <div className="space-y-2 sm:max-w-[12rem]">
                <Label htmlFor="nc-days">Trial length (days)</Label>
                <Input id="nc-days" inputMode="numeric" {...register("trialDays")} />
                <FieldError id="nc-days-error" message={errors.trialDays?.message} />
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner</h3>
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
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Roles</h3>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="nc-roles" className="text-sm">Standard roles: Manager, Cashier, Attendant</Label>
              <Switch id="nc-roles" checked={watch("standardRoles")} onCheckedChange={(v) => setValue("standardRoles", v)} />
            </div>
            {roles.length > 0 && (
              <ul className="divide-y rounded-md border">
                {roles.map((r, i) => (
                  <li key={`${r.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-medium">{r.name}<span className="ml-2 font-normal text-muted-foreground">{r.permissions.length} permissions{r.daily.trim() ? `, ₦${Number(r.daily).toLocaleString("en-NG")} a day` : ""}</span></span>
                    <span className="flex shrink-0 gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing({ index: i, draft: r })}>Edit</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setRoles((cur) => cur.filter((_, k) => k !== i))}>Remove</Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing({ index: null, draft: emptyDraft() })}>Add a role</Button>
          </section>

          <section className="space-y-2">
            <Label htmlFor="nc-reason">Reason</Label>
            <Input id="nc-reason" placeholder="e.g. Signed on 5 Nov" aria-invalid={!!errors.reason} {...register("reason")} />
            <FieldError id="nc-reason-error" message={errors.reason?.message} />
          </section>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
          <Button type="submit" form="new-company" disabled={create.isPending || branding.isPending}>{create.isPending || branding.isPending ? "Creating…" : "Create company and invite owner"}</Button>
        </DialogFooter>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.index === null ? "Add a role" : "Edit role"}</DialogTitle>
          </DialogHeader>
          {editing && <RoleFields draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          {editing && draftProblem(editing.draft) && editing.draft.name.trim().length > 0 && <p className="text-xs text-muted-foreground">{draftProblem(editing.draft)}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              disabled={!editing || draftProblem(editing.draft) !== null || roles.some((r, i) => i !== editing.index && r.name.trim().toLowerCase() === editing.draft.name.trim().toLowerCase())}
              onClick={() => {
                if (!editing) return;
                setRoles((cur) => (editing.index === null ? [...cur, editing.draft] : cur.map((r, i) => (i === editing.index ? editing.draft : r))));
                setEditing(null);
              }}
            >
              {editing?.index === null ? "Add role" : "Save role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </DialogContent>
    </Dialog>
  );
}
