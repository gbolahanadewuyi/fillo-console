import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useControlCompanies, useCreateCase } from "@/hooks/useControlApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CaseDefaults {
  companyId?: string;
  userId?: string;
  orderId?: string;
  posTransactionId?: string;
}

/** Opens a case about one company, optionally pointing at a person, an order or a transaction of theirs. */
export function NewCaseDialog({ open, onOpenChange, defaults = {} }: { open: boolean; onOpenChange: (open: boolean) => void; defaults?: CaseDefaults }) {
  const navigate = useNavigate();
  const create = useCreateCase();
  const [companyId, setCompanyId] = useState(defaults.companyId ?? "");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data: companies } = useControlCompanies({ pageSize: 100 });
  const valid = !!companyId && title.trim().length >= 3;

  async function submit() {
    setError(null);
    try {
      const made = await create.mutateAsync({ companyId, title: title.trim(), userId: defaults.userId, orderId: defaults.orderId, posTransactionId: defaults.posTransactionId, note: note.trim() || undefined });
      onOpenChange(false);
      navigate(`/cases/${made.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The case could not be opened.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New case</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!defaults.companyId && (
            <div className="space-y-2">
              <Label htmlFor="case-company">Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger id="case-company" aria-label="Company"><SelectValue placeholder="Choose a company" /></SelectTrigger>
                <SelectContent>
                  {(companies?.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="case-title">Title</Label>
            <Input id="case-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="case-note">First note</Label>
            <Textarea id="case-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || create.isPending}>{create.isPending ? "Opening…" : "Open case"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
