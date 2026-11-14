import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorReference } from "@/components/ErrorReference";
import { useCreateCompanyRole } from "@/hooks/useControlApi";
import { RoleFields, draftPayload, draftProblem, emptyDraft, type RoleDraft } from "@/components/RoleFields";
import { useToast } from "@/hooks/use-toast";

export { groupPermissions } from "@/components/RoleFields";

/** Create a role for a company Fillo is setting up: a name, what it may do, and (optionally) the most it can approve in expenses. */
export function NewRoleDialog({ companyId, open, onOpenChange }: { companyId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const create = useCreateCompanyRole();
  const [draft, setDraft] = useState<RoleDraft>(emptyDraft());
  const [error, setError] = useState<unknown>(null);
  const ready = draftProblem(draft) === null && !create.isPending;

  function reset() {
    setDraft(emptyDraft());
    setError(null);
  }

  async function save() {
    if (!ready) return;
    setError(null);
    try {
      await create.mutateAsync({ id: companyId, ...draftPayload(draft) });
      toast({ title: "Role created", description: `${draft.name.trim()} can now be given to people.` });
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
          <RoleFields draft={draft} onChange={setDraft} enabled={open} />
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
