import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorReference } from "@/components/ErrorReference";
import { MIN_REASON_LENGTH } from "@/components/ConfirmWithReason";
import { useUpdateOwner, type ControlUser } from "@/hooks/useControlApi";
import { useToast } from "@/hooks/use-toast";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Correct the details of a company's owner who has already accepted: name, phone and the email they sign in with. Changing the email signs them out
 * everywhere and tells the old address, so it says so before it is saved.
 */
export function EditOwnerDialog({ owner, open, onOpenChange }: { owner: ControlUser; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const update = useUpdateOwner();
  const [name, setName] = useState(owner.name);
  const [phone, setPhone] = useState(owner.phone ?? "");
  const [email, setEmail] = useState(owner.email);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>(null);

  const changed = {
    name: name.trim() !== owner.name,
    phone: phone.trim() !== (owner.phone ?? ""),
    email: email.trim().toLowerCase() !== owner.email.toLowerCase(),
  };
  const ready = name.trim().length > 0 && EMAIL.test(email.trim()) && (changed.name || changed.phone || changed.email) && (!changed.email || reason.trim().length >= MIN_REASON_LENGTH) && !update.isPending;

  async function save() {
    if (!ready) return;
    setError(null);
    try {
      const res = await update.mutateAsync({
        companyId: owner.companyId,
        ...(changed.name ? { name: name.trim() } : {}),
        ...(changed.phone ? { phone: phone.trim() || null } : {}),
        ...(changed.email ? { email: email.trim() } : {}),
        ...(changed.email ? { reason: reason.trim() } : {}),
      });
      toast({ title: "Owner updated", description: res.emailChanged ? "They were signed out and the old address was told." : undefined });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The owner could not be changed."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!update.isPending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit owner</DialogTitle>
          <DialogDescription>Correct the owner's details. Their password does not change.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="owner-name">Name</Label>
            <Input id="owner-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-phone">Phone</Label>
            <Input id="owner-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-email">Sign-in email</Label>
            <Input id="owner-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            {changed.email && <p className="text-xs text-muted-foreground">Changing the email signs {owner.name} out on every device, and the old address is told.</p>}
          </div>
          {changed.email && (
            <div className="space-y-2">
              <Label htmlFor="owner-reason">Reason for changing the email (kept in the audit trail)</Label>
              <Textarea id="owner-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} placeholder="e.g. Owner asked to use their company email" />
            </div>
          )}
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
