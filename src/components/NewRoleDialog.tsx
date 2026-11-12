import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorReference } from "@/components/ErrorReference";
import { MIN_REASON_LENGTH } from "@/components/ConfirmWithReason";
import { useCreateCompanyRole, usePermissionCatalogue } from "@/hooks/useControlApi";
import { useToast } from "@/hooks/use-toast";

/** Permissions come as `area.action` (orders.edit, expenses.approve): group them by area, so a long list reads as a few short ones. */
export function groupPermissions<T extends { key: string }>(permissions: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const p of permissions) {
    const area = p.key.split(".")[0] ?? p.key;
    groups.set(area, [...(groups.get(area) ?? []), p]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

const MONEY = /^\d+(\.\d{1,2})?$/;

/** Create a role for a company Fillo is setting up: a name, what it may do, and (optionally) the most it can approve in expenses. */
export function NewRoleDialog({ companyId, open, onOpenChange }: { companyId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const catalogue = usePermissionCatalogue(open);
  const create = useCreateCompanyRole();
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [daily, setDaily] = useState("");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>(null);
  const groups = useMemo(() => groupPermissions(catalogue.data ?? []), [catalogue.data]);
  const limitOk = limit.trim() === "" || MONEY.test(limit.trim());
  const dailyOk = daily.trim() === "" || MONEY.test(daily.trim());
  const ready = name.trim().length >= 2 && chosen.size > 0 && limitOk && dailyOk && reason.trim().length >= MIN_REASON_LENGTH && !create.isPending;

  function toggle(key: string, on: boolean) {
    setChosen((cur) => {
      const next = new Set(cur);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function reset() {
    setName("");
    setLimit("");
    setDaily("");
    setChosen(new Set());
    setReason("");
    setError(null);
  }

  async function save() {
    if (!ready) return;
    setError(null);
    try {
      await create.mutateAsync({ id: companyId, name: name.trim(), permissions: [...chosen], ...(limit.trim() ? { spendingLimit: Number(limit.trim()).toFixed(2) } : {}), ...(daily.trim() ? { dailySpendingLimit: Number(daily.trim()).toFixed(2) } : {}), reason: reason.trim() });
      toast({ title: "Role created", description: `${name.trim()} can now be given to people.` });
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The role could not be created."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!create.isPending) { if (!o) reset(); onOpenChange(o); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>A set of things a person may do. Give it to people when you add them.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role-name">Name</Label>
              <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-limit">Expense approval limit (₦, optional)</Label>
              <Input id="role-limit" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Company default" aria-invalid={!limitOk} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="role-daily">Daily spending allowance (₦, optional)</Label>
              <Input id="role-daily" inputMode="decimal" value={daily} onChange={(e) => setDaily(e.target.value.replace(/[^\d.]/g, ""))} placeholder="None" aria-invalid={!dailyOk} aria-describedby="role-daily-help" />
              <p id="role-daily-help" className="text-xs text-muted-foreground">What people in this role may spend on their own authority in a day, without anyone approving. The expense that would pass it waits for approval.</p>
            </div>
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">What this role may do</legend>
            {catalogue.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {groups.map(([area, items]) => (
              <div key={area} className="rounded-md border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{area}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((p) => (
                    <label key={p.key} className="flex items-start gap-2 text-sm">
                      <Checkbox checked={chosen.has(p.key)} onCheckedChange={(v) => toggle(p.key, v === true)} aria-label={p.label} className="mt-0.5" />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="role-reason">Reason (kept in the audit trail)</Label>
            <Textarea id="role-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} />
          </div>
          {!!error && (
            <div role="alert" className="text-sm text-destructive">
              {(error as Error).message}
              <ErrorReference error={error} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
          <Button onClick={save} disabled={!ready}>{create.isPending ? "Creating…" : "Create role"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
