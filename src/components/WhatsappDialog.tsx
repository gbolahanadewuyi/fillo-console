import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateWhatsapp, type ControlWhatsappNumber, type WhatsappPatch, type WhatsappStatus } from "@/hooks/useControlApi";
import { lagos } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/FieldError";
import { StatusBadge } from "@/components/StatusBadge";

const STEPS: { value: Exclude<WhatsappStatus, "REQUESTED">; label: string }[] = [
  { value: "NUMBER_ASSIGNED", label: "Number assigned" },
  { value: "PENDING_APPROVAL", label: "Name submitted, awaiting WhatsApp" },
  { value: "LIVE", label: "Live" },
  { value: "PAUSED", label: "Paused" },
];

const schema = z.object({
  status: z.string(),
  phoneNumberId: z.string().trim().refine((v) => v === "" || /^\d{5,30}$/.test(v), "Meta's phone number id is all digits"),
  displayPhoneNumber: z.string().trim().refine((v) => v === "" || v.length >= 7, "The number customers dial, with the country code"),
  note: z.string().trim().max(500),
});
type Values = z.infer<typeof schema>;

/** Move one company's number along. Only what changed is sent. The note is what the COMPANY is told. */
export function WhatsappDialog({ number, onClose }: { number: ControlWhatsappNumber; onClose: () => void }) {
  const update = useUpdateWhatsapp();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { status: number.status === "REQUESTED" ? "" : number.status, phoneNumberId: number.phoneNumberId ?? "", displayPhoneNumber: number.displayPhoneNumber ?? "", note: number.statusNote ?? "" },
  });
  const v = watch();

  const patch: WhatsappPatch = {};
  if (v.status && v.status !== number.status) patch.status = v.status as WhatsappPatch["status"];
  if (v.phoneNumberId && v.phoneNumberId !== (number.phoneNumberId ?? "")) patch.phoneNumberId = v.phoneNumberId;
  if (v.displayPhoneNumber && v.displayPhoneNumber !== (number.displayPhoneNumber ?? "")) patch.displayPhoneNumber = v.displayPhoneNumber;
  if (v.note !== (number.statusNote ?? "")) patch.note = v.note || null;
  const changed = Object.keys(patch).length > 0;

  async function submit(values: Values) {
    setError(null);
    // The same rules the API enforces, said before the round trip.
    const next = { status: (values.status || number.status) as WhatsappStatus, id: values.phoneNumberId, shown: values.displayPhoneNumber };
    if (["NUMBER_ASSIGNED", "PENDING_APPROVAL", "LIVE"].includes(next.status) && (!next.id || !next.shown)) return setError("Give the Meta phone number id and the number customers will dial first.");
    if (next.status === "PAUSED" && !values.note) return setError("Say why it is paused: the company will read it.");
    try {
      await update.mutateAsync({ id: number.id, patch });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !update.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{number.companyName}</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Name customers see</dt>
          <dd className="font-medium">{number.requestedDisplayName ?? "—"}</dd>
          <dt className="text-muted-foreground">Contact</dt>
          <dd>{number.requestedContact ?? "—"}</dd>
          <dt className="text-muted-foreground">Requested</dt>
          <dd>{lagos(number.requestedAt)}</dd>
          <dt className="text-muted-foreground">Now</dt>
          <dd>
            <StatusBadge status={number.status.toLowerCase()} />
          </dd>
        </dl>
        <form id="whatsapp-form" onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="wa-id">Meta phone number id</Label>
              <Input id="wa-id" inputMode="numeric" aria-invalid={!!errors.phoneNumberId} {...register("phoneNumberId")} />
              <FieldError id="wa-id-error" message={errors.phoneNumberId?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-number">Number customers dial</Label>
              <Input id="wa-number" placeholder="+234 …" aria-invalid={!!errors.displayPhoneNumber} {...register("displayPhoneNumber")} />
              <FieldError id="wa-number-error" message={errors.displayPhoneNumber?.message} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-status">Move it to</Label>
            <Select value={v.status} onValueChange={(next) => setValue("status", next, { shouldDirty: true })}>
              <SelectTrigger id="wa-status" aria-label="Move it to">
                <SelectValue placeholder={number.status === "REQUESTED" ? "Choose the next step" : undefined} />
              </SelectTrigger>
              <SelectContent>
                {STEPS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-note">Note for the company</Label>
            <Textarea id="wa-note" rows={2} maxLength={500} {...register("note")} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="whatsapp-form" disabled={!changed || update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
