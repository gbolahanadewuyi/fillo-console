import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ErrorReference } from "@/components/ErrorReference";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What will happen and who it affects, in plain words. */
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Resolve to close the dialog; throw to keep it open and show the error. */
  onConfirm: () => Promise<unknown>;
}

/** A plain "are you sure" for an action that is hard to take back but does not need a reason typed. Use `ConfirmWithReason` for the weightier ones. */
export function ConfirmAction({ open, onOpenChange, title, description, confirmLabel, destructive, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  function close(next: boolean) {
    if (busy) return;
    if (!next) setError(null);
    onOpenChange(next);
  }

  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The change failed."));
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
        {!!error && (
          <div role="alert" className="text-sm text-destructive">
            {(error as Error).message}
            <ErrorReference error={error} />
          </div>
        )}
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>Cancel</Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={() => void run()} disabled={busy}>{busy ? "Working…" : confirmLabel}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
