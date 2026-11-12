import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissionCatalogue } from "@/hooks/useControlApi";

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

/** A role being written: kept as the typed text until it is saved. */
export interface RoleDraft {
  name: string;
  limit: string;
  daily: string;
  permissions: string[];
}
export const emptyDraft = (): RoleDraft => ({ name: "", limit: "", daily: "", permissions: [] });

export function draftProblem(d: RoleDraft): string | null {
  if (d.name.trim().length < 2) return "Give the role a name.";
  if (d.permissions.length === 0) return "Choose at least one thing the role may do.";
  if (d.limit.trim() !== "" && !MONEY.test(d.limit.trim())) return "The approval limit must be an amount.";
  if (d.daily.trim() !== "" && !MONEY.test(d.daily.trim())) return "The daily allowance must be an amount.";
  return null;
}

/** The role as the API takes it. */
export function draftPayload(d: RoleDraft) {
  return {
    name: d.name.trim(),
    permissions: d.permissions,
    ...(d.limit.trim() ? { spendingLimit: Number(d.limit.trim()).toFixed(2) } : {}),
    ...(d.daily.trim() ? { dailySpendingLimit: Number(d.daily.trim()).toFixed(2) } : {}),
  };
}

/** Name, expense limits and permissions of one role. Used when adding a role to a company and when creating a company with its own roles. */
export function RoleFields({ draft, onChange, enabled = true }: { draft: RoleDraft; onChange: (next: RoleDraft) => void; enabled?: boolean }) {
  const catalogue = usePermissionCatalogue(enabled);
  const groups = useMemo(() => groupPermissions(catalogue.data ?? []), [catalogue.data]);
  const limitOk = draft.limit.trim() === "" || MONEY.test(draft.limit.trim());
  const dailyOk = draft.daily.trim() === "" || MONEY.test(draft.daily.trim());
  const money = (v: string) => v.replace(/[^\d.]/g, "");

  function toggle(key: string, on: boolean) {
    const next = new Set(draft.permissions);
    if (on) next.add(key);
    else next.delete(key);
    onChange({ ...draft, permissions: [...next] });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role-name">Name</Label>
          <Input id="role-name" value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} autoComplete="off" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role-limit">Expense approval limit (₦, optional)</Label>
          <Input id="role-limit" inputMode="decimal" value={draft.limit} onChange={(e) => onChange({ ...draft, limit: money(e.target.value) })} placeholder="Company default" aria-invalid={!limitOk} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="role-daily">Daily spending allowance (₦, optional)</Label>
          <Input id="role-daily" inputMode="decimal" value={draft.daily} onChange={(e) => onChange({ ...draft, daily: money(e.target.value) })} placeholder="None" aria-invalid={!dailyOk} aria-describedby="role-daily-help" />
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
                  <Checkbox checked={draft.permissions.includes(p.key)} onCheckedChange={(v) => toggle(p.key, v === true)} aria-label={p.label} className="mt-0.5" />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
    </div>
  );
}
