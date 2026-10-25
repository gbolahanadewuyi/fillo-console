import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useExtendTrial } from "@/hooks/useControlApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/FieldError";
import { MIN_REASON_LENGTH } from "@/components/ConfirmWithReason";

const schema = z.object({
  days: z.coerce.number({ invalid_type_error: "Enter a number of days" }).int("A whole number of days").min(1, "At least 1 day").max(90, "At most 90 days at a time"),
  reason: z.string().trim().min(MIN_REASON_LENGTH, `Give a reason of at least ${MIN_REASON_LENGTH} characters`).max(500),
});
type Values = z.infer<typeof schema>;

export function ExtendTrialDialog({ companyId, companyName, onClose }: { companyId: string; companyName: string; onClose: () => void }) {
  const extend = useExtendTrial();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<{ days: string; reason: string }>({ resolver: zodResolver(schema) as never, defaultValues: { days: "7", reason: "" } });

  async function submit(values: { days: string; reason: string }) {
    setError(null);
    try {
      const parsed = schema.parse(values) as Values;
      await extend.mutateAsync({ companyId, days: parsed.days, reason: parsed.reason });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The trial could not be extended.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !extend.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend {companyName}'s trial</DialogTitle>
        </DialogHeader>
        <form id="extend-trial" onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trial-days">Days to add</Label>
            <Input id="trial-days" inputMode="numeric" aria-invalid={!!errors.days} {...register("days")} />
            <FieldError id="trial-days-error" message={errors.days?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trial-reason">Reason (kept in the audit trail)</Label>
            <Textarea id="trial-reason" rows={2} maxLength={500} aria-invalid={!!errors.reason} {...register("reason")} />
            <FieldError id="trial-reason-error" message={errors.reason?.message} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={extend.isPending}>Cancel</Button>
          <Button type="submit" form="extend-trial" disabled={extend.isPending}>{extend.isPending ? "Saving…" : "Extend trial"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
