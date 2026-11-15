import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorReference } from "@/components/ErrorReference";
import { useUpdateCompanyRole, type CompanyRole } from "@/hooks/useControlApi";
import { RoleFields, draftPayload, draftProblem, type RoleDraft } from "@/components/RoleFields";
import { useToast } from "@/hooks/use-toast";

const draftOf = (role: CompanyRole): RoleDraft => ({ name: role.name, limit: role.spendingLimit ?? "", daily: role.dailySpendingLimit ?? "", permissions: role.permissions });

/** Change a role a company already has: its name, what it may do, and its expense limits. Everyone in the role is affected. The Owner role is protected. */
export function EditRoleDialog({ companyId, role, open, onOpenChange }: { companyId: string; role: CompanyRole; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const update = useUpdateCompanyRole();
  const [draft, setDraft] = useState<RoleDraft>(draftOf(role));
  const [error, setError] = useState<unknown>(null);
  const ready = draftProblem(draft) === null && !update.isPending;

  async function save() {
    if (!ready) return;
    setError(null);
    const { spendingLimit, dailySpendingLimit, ...rest } = draftPayload(draft);
    try {
      // A cleared limit is sent as null, so it is removed rather than left as it was.
      await update.mutateAsync({ companyId, roleId: role.id, ...rest, spendingLimit: spendingLimit ?? null, dailySpendingLimit: dailySpendingLimit ?? null });
      toast({ title: "Role updated", description: `Everyone who is a ${draft.name.trim()} has the change from their next action.` });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The role could not be changed."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!update.isPending) onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit role</DialogTitle>
          <DialogDescription>This changes it for everyone who has the role.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RoleFields draft={draft} onChange={setDraft} enabled={open} />
          {!!error && (
            <div role="alert" className="text-sm text-destructive">
              {(error as Error).message}
              <ErrorReference error={error} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>Cancel</Button>
          <Button onClick={save} disabled={!ready}>{update.isPending ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
