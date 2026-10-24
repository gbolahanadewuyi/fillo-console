import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const MIN_REASON_LENGTH = 5;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "Suspend Seegas" */
  title: string;
  /** What will happen and who it affects, in plain words. */
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Resolve to close the dialog; throw to keep it open and show the error. */
  onConfirm: (reason: string) => Promise<unknown>;
}

/**
 * The one way the console makes a sensitive change: say what will happen, require a reason, run the change,
 * and only close when it actually succeeded. The reason is sent to the API and kept in the audit trail.
 */
export function ConfirmWithReason({ open, onOpenChange, title, description, confirmLabel, destructive, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_REASON_LENGTH;

  function close(next: boolean) {
    if (busy) return;
    if (!next) {
      setReason("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function run() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      setReason("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The change failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-reason">Reason (kept in the audit trail)</Label>
          <Textarea id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} autoFocus />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={run} disabled={!valid || busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
