import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorReference } from "@/components/ErrorReference";
import { useCompanyRoles, useControlStations, useStartSupportSession } from "@/hooks/useControlApi";

/** Opens the company's own app in a new tab as one of its roles. Read-only at first; the person using it enables changes there, with a second reason. */
export function OpenAsSupportDialog({ companyId, companyName, open, onOpenChange }: { companyId: string; companyName: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const roles = useCompanyRoles(companyId);
  const stations = useControlStations({ companyId, pageSize: 50 });
  const start = useStartSupportSession();
  const [roleId, setRoleId] = useState("");
  const [stationId, setStationId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>(null);

  const role = (roles.data ?? []).find((r) => r.id === roleId);
  const isOwnerRole = !!role?.isSystemRole && role.name === "Owner";
  const stationList = stations.data?.data ?? [];
  const station = stationId || (stationList.length === 1 ? stationList[0]!.id : "");
  const ready = !!role && (isOwnerRole || !!station) && reason.trim().length >= 5 && !start.isPending;

  async function submit() {
    if (!ready) return;
    setError(null);
    // The tab is opened now, while the click is still fresh, so the browser does not treat it as a pop-up; its address is filled in once the link is ready.
    const tab = window.open("", "_blank");
    try {
      const res = await start.mutateAsync({ companyId, roleId, ...(isOwnerRole ? {} : { stationId: station }), reason: reason.trim() });
      if (tab) {
        tab.opener = null;
        tab.location.href = res.url;
      } else {
        window.location.href = res.url;
      }
      setReason("");
      onOpenChange(false);
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e : new Error("The company could not be opened."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!start.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open {companyName} as support</DialogTitle>
          <DialogDescription>Opens their app in a new tab as the role you choose, read-only, for 30 minutes. It is recorded in their activity log.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="support-role">Open as</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="support-role" aria-label="Open as"><SelectValue placeholder="Choose a role" /></SelectTrigger>
              <SelectContent>{(roles.data ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {role && !isOwnerRole && stationList.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="support-station">Station</Label>
              <Select value={stationId} onValueChange={setStationId}>
                <SelectTrigger id="support-station" aria-label="Station"><SelectValue placeholder="Choose a station" /></SelectTrigger>
                <SelectContent>{stationList.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="support-reason">Why</Label>
            <Input id="support-reason" value={reason} onChange={(e) => setReason(e.target.value)} autoComplete="off" />
          </div>
          {!!error && (
            <div role="alert" className="text-sm text-destructive">
              {(error as Error).message}
              <ErrorReference error={error} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={start.isPending}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={!ready}>{start.isPending ? "Opening…" : "Open"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
