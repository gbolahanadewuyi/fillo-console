import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorReference } from "@/components/ErrorReference";
import { MIN_REASON_LENGTH } from "@/components/ConfirmWithReason";
import { useDeleteCompany, useDeletionPreview } from "@/hooks/useControlApi";

/** The name has to match exactly, as on GitHub and in cloud consoles: deleting a company cannot be undone, so a click is not enough. */
export function nameMatches(typed: string, name: string): boolean {
  return typed.trim() === name;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: { id: string; name: string };
  onDeleted: () => void;
}

export function DeleteCompanyDialog({ open, onOpenChange, company, onDeleted }: Props) {
  const preview = useDeletionPreview(company.id, open);
  const remove = useDeleteCompany();
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>(null);
  const ready = nameMatches(typed, company.name) && reason.trim().length >= MIN_REASON_LENGTH && !remove.isPending;

  function close(next: boolean) {
    if (remove.isPending) return;
    if (!next) {
      setTyped("");
      setReason("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function run() {
    if (!ready) return;
    setError(null);
    try {
      await remove.mutateAsync({ id: company.id, confirmName: typed.trim(), reason: reason.trim() });
      close(false);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The company could not be deleted."));
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {company.name}?</AlertDialogTitle>
          <AlertDialogDescription>This permanently deletes the company and everything it owns. It cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-sm" aria-live="polite">
          {preview.isLoading && <p className="text-muted-foreground">Counting what will be deleted…</p>}
          {preview.isError && <p className="text-destructive">Could not count what will be deleted. You can still continue.</p>}
          {preview.data && preview.data.items.length === 0 && <p className="text-muted-foreground">There is no data besides the company itself.</p>}
          {preview.data && preview.data.items.length > 0 && (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
              {preview.data.items.map((i) => (
                <li key={i.label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{i.label}</span>
                  <span className="font-medium tabular-nums">{i.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="delete-confirm-name">
              Type <span className="font-semibold">{company.name}</span> to confirm
            </Label>
            <Input id="delete-confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delete-reason">Reason (kept in the audit trail)</Label>
            <Textarea id="delete-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} />
          </div>
          {!!error && (
            <div role="alert" className="text-sm text-destructive">
              {(error as Error).message}
              <ErrorReference error={error} />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={run} disabled={!ready}>
            {remove.isPending ? "Deleting…" : "Delete permanently"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
