import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorReference } from "@/components/ErrorReference";
import { useCompanyRoles, useControlStations, useInvitePerson } from "@/hooks/useControlApi";
import { useToast } from "@/hooks/use-toast";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The roles a person can be invited as: everything but Owner, who is invited once when the company is created. */
export function invitableRoles<T extends { name: string; isSystemRole: boolean }>(roles: T[]): T[] {
  return roles.filter((r) => !(r.isSystemRole && r.name === "Owner"));
}

/** Invite someone to a company Fillo is setting up. They get the invitation email, choose their own password, and land with this role at this station. */
export function AddPersonDialog({ companyId, open, onOpenChange }: { companyId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const roles = useCompanyRoles(companyId);
  const stations = useControlStations({ companyId, pageSize: 50 });
  const invite = useInvitePerson();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [stationId, setStationId] = useState("");
  const [error, setError] = useState<unknown>(null);

  const choices = invitableRoles(roles.data ?? []);
  const stationList = stations.data?.data ?? [];
  // One station is the common case: nothing to choose.
  const station = stationId || (stationList.length === 1 ? stationList[0]!.id : "");
  const ready = EMAIL.test(email.trim()) && !!roleId && !!station && !invite.isPending;

  function reset() {
    setEmail("");
    setRoleId("");
    setStationId("");
    setError(null);
  }

  async function send() {
    if (!ready) return;
    setError(null);
    try {
      const res = await invite.mutateAsync({ id: companyId, email: email.trim(), roleId, stationId: station });
      toast(res.emailSent ? { title: "Invitation sent", description: `${res.email} was invited as ${res.roleName}.` } : { title: "Invitation created, email not sent", description: "Resend it from the Invitations list.", variant: "destructive" as never });
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The invitation could not be sent."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!invite.isPending) { if (!o) reset(); onOpenChange(o); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a person</DialogTitle>
          <DialogDescription>They get an invitation email, set their own password, and join with this role.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="person-email">Email</Label>
            <Input id="person-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="person-role">Role</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger id="person-role"><SelectValue placeholder="Choose a role" /></SelectTrigger>
                <SelectContent>{choices.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="person-station">Station</Label>
              <Select value={station} onValueChange={setStationId}>
                <SelectTrigger id="person-station"><SelectValue placeholder="Choose a station" /></SelectTrigger>
                <SelectContent>{stationList.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {!!error && (
            <div role="alert" className="text-sm text-destructive">
              {(error as Error).message}
              <ErrorReference error={error} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={invite.isPending}>Cancel</Button>
          <Button onClick={send} disabled={!ready}>{invite.isPending ? "Sending…" : "Send invitation"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
