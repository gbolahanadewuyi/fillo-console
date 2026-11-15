import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorReference } from "@/components/ErrorReference";
import { invitableRoles } from "@/components/AddPersonDialog";
import { useCompanyRoles, useUpdateCompanyUser } from "@/hooks/useControlApi";
import { useToast } from "@/hooks/use-toast";

/** Move a person who has already joined to another of their company's roles. The owner is never moved, and nobody is moved into the Owner role. */
export function ChangeRoleDialog({ companyId, userId, userName, currentRole, open, onOpenChange }: { companyId: string; userId: string; userName: string; currentRole: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const roles = useCompanyRoles(companyId);
  const update = useUpdateCompanyUser();
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<unknown>(null);
  const choices = invitableRoles(roles.data ?? []).filter((r) => r.name !== currentRole);

  async function save() {
    if (!roleId) return;
    setError(null);
    try {
      await update.mutateAsync({ companyId, userId, roleId });
      toast({ title: "Role changed", description: `${userName} has the new role from their next action.` });
      setRoleId("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The role could not be changed."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!update.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change {userName}&apos;s role</DialogTitle>
          <DialogDescription>Now {currentRole}. What they may do follows the role they are given.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>New role</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger aria-label="New role"><SelectValue placeholder="Choose a role" /></SelectTrigger>
            <SelectContent>{choices.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
          {!!error && (
            <div role="alert" className="text-sm text-destructive">
              {(error as Error).message}
              <ErrorReference error={error} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>Cancel</Button>
          <Button onClick={save} disabled={!roleId || update.isPending}>{update.isPending ? "Saving…" : "Change role"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
