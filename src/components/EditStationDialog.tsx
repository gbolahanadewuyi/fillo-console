import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorReference } from "@/components/ErrorReference";
import { useUpdateCompanyStation, type ControlStation } from "@/hooks/useControlApi";
import { useToast } from "@/hooks/use-toast";

/** Correct a station's name, address or phone for a company Fillo is looking after. The change is recorded with the reason. */
export function EditStationDialog({ station, open, onOpenChange }: { station: ControlStation; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const update = useUpdateCompanyStation();
  const [name, setName] = useState(station.name);
  const [address, setAddress] = useState(station.address ?? "");
  const [phone, setPhone] = useState(station.phone ?? "");
  const [error, setError] = useState<unknown>(null);

  const changed = { name: name.trim() !== station.name, address: address.trim() !== (station.address ?? ""), phone: phone.trim() !== (station.phone ?? "") };
  const ready = name.trim().length > 0 && (changed.name || changed.address || changed.phone) && !update.isPending;

  async function save() {
    if (!ready) return;
    setError(null);
    try {
      await update.mutateAsync({
        companyId: station.companyId,
        stationId: station.id,
        ...(changed.name ? { name: name.trim() } : {}),
        ...(changed.address && address.trim() ? { address: address.trim() } : {}),
        ...(changed.phone && phone.trim() ? { phone: phone.trim() } : {}),
      });
      toast({ title: "Station updated" });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The station could not be changed."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!update.isPending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit station</DialogTitle>
          <DialogDescription>The owner sees the change on their Stations page.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="station-name">Name</Label>
            <Input id="station-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="station-address">Address</Label>
            <Input id="station-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="station-phone">Phone</Label>
            <Input id="station-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {!!error && (
            <div role="alert" className="text-sm text-destructive">
              {(error as Error).message}
              <ErrorReference error={error} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>Cancel</Button>
          <Button onClick={() => void save()} disabled={!ready}>{update.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
