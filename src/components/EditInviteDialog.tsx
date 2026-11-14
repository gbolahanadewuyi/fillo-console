import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorReference } from "@/components/ErrorReference";
import { invitableRoles } from "@/components/AddPersonDialog";
import { useCompanyRoles, useControlStations, useUpdateInvite, type ControlInvite } from "@/hooks/useControlApi";
import { useToast } from "@/hooks/use-toast";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Correct a pending invitation: who it is for, and for anyone but the owner the role and station. Saving sends it again with the changes, because
 * the person has not seen the corrected one yet; a new email gets a new link and the old address's link stops working.
 */
export function EditInviteDialog({ invite, open, onOpenChange }: { invite: ControlInvite; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const update = useUpdateInvite();
  const roles = useCompanyRoles(invite.companyId);
  const stations = useControlStations({ companyId: invite.companyId, pageSize: 50 });
  const [name, setName] = useState(invite.name ?? "");
  const [email, setEmail] = useState(invite.email);
  const [roleId, setRoleId] = useState(invite.roleId ?? "");
  const [stationId, setStationId] = useState(invite.stationId ?? "");
  const [error, setError] = useState<unknown>(null);

  const changed = {
    name: name.trim() !== (invite.name ?? ""),
    email: email.trim().toLowerCase() !== invite.email.toLowerCase(),
    roleId: !invite.isOwner && roleId !== (invite.roleId ?? ""),
    stationId: !invite.isOwner && stationId !== (invite.stationId ?? ""),
  };
  const valid = EMAIL.test(email.trim()) && (!invite.isOwner || name.trim().length > 0 || !changed.name) && !update.isPending;

  async function save(resend: boolean) {
    setError(null);
    try {
      const res = await update.mutateAsync({
        id: invite.id,
        ...(changed.name && name.trim() ? { name: name.trim() } : {}),
        ...(changed.email ? { email: email.trim() } : {}),
        ...(changed.roleId ? { roleId } : {}),
        ...(changed.stationId ? { stationId } : {}),
        resend,
      });
      toast(!resend ? { title: "Invitation saved" } : res.emailSent ? { title: "Invitation corrected and sent", description: `Sent to ${email.trim()}.` } : { title: "Invitation corrected, but the email did not go out", description: "Try Resend." });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The invitation could not be changed."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!update.isPending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit invitation</DialogTitle>
          <DialogDescription>
            {invite.isOwner ? "Correct who this owner invitation is for." : "Correct who this is for, their role and their station."} A new email gets its own link; the old address's link stops working.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </div>
          {!invite.isOwner && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger id="invite-role"><SelectValue placeholder="Choose a role" /></SelectTrigger>
                  <SelectContent>{invitableRoles(roles.data ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-station">Station</Label>
                <Select value={stationId} onValueChange={setStationId}>
                  <SelectTrigger id="invite-station"><SelectValue placeholder="Choose a station" /></SelectTrigger>
                  <SelectContent>{(stations.data?.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          {!!error && (
            <div role="alert" className="text-sm text-destructive">
              {(error as Error).message}
              <ErrorReference error={error} />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>Cancel</Button>
          <Button variant="outline" onClick={() => void save(false)} disabled={!valid}>Save</Button>
          <Button onClick={() => void save(true)} disabled={!valid}>{update.isPending ? "Saving…" : "Save and resend"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
