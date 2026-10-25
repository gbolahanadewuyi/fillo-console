import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useControlCompanies, useCreateCase } from "@/hooks/useControlApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/FieldError";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  companyId: z.string().min(1, "Choose a company"),
  title: z.string().trim().min(3, "Give the case a short title").max(150),
  note: z.string().trim().max(2000),
});
type Values = z.infer<typeof schema>;

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
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { companyId: defaults.companyId ?? "", title: "", note: "" } });
  const { data: companies } = useControlCompanies({ pageSize: 100 });

  async function submit(values: Values) {
    setError(null);
    try {
      const made = await create.mutateAsync({ companyId: values.companyId, title: values.title, userId: defaults.userId, orderId: defaults.orderId, posTransactionId: defaults.posTransactionId, note: values.note || undefined });
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
        <form id="new-case" onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          {!defaults.companyId && (
            <div className="space-y-2">
              <Label htmlFor="case-company">Company</Label>
              <Select value={watch("companyId")} onValueChange={(v) => setValue("companyId", v, { shouldValidate: true })}>
                <SelectTrigger id="case-company" aria-label="Company"><SelectValue placeholder="Choose a company" /></SelectTrigger>
                <SelectContent>
                  {(companies?.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError id="company-error" message={errors.companyId?.message} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="case-title">Title</Label>
            <Input id="case-title" maxLength={150} autoFocus aria-invalid={!!errors.title} aria-describedby="title-error" {...register("title")} />
            <FieldError id="title-error" message={errors.title?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="case-note">First note</Label>
            <Textarea id="case-note" rows={3} maxLength={2000} {...register("note")} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="new-case" disabled={create.isPending}>{create.isPending ? "Opening…" : "Open case"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
