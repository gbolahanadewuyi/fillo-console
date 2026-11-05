import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmWithReason } from "@/components/ConfirmWithReason";
import { useCompanySettings, useSetCompanySetting, type OrderEditingSetting } from "@/hooks/useControlApi";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";

const FIELDS: { key: keyof OrderEditingSetting; label: string; unit: string }[] = [
  { key: "lockAfterHours", label: "Lock orders after", unit: "hours" },
  { key: "hardLockAfterDays", label: "Close orders after (0 = never)", unit: "days" },
  { key: "cashierEditMinutes", label: "Cashier can edit own sale for", unit: "minutes" },
  { key: "cashierCorrectionMinutes", label: "Cashier can reduce a payment for", unit: "minutes" },
];

/** A company's order editing rules, changed for it when it asks. The same setting its owner has on their Settings screen. */
export function OrderEditingOverride({ companyId }: { companyId: string }) {
  const { user } = useAuth();
  const allowed = can(user?.platformRole, "company.override");
  const { data } = useCompanySettings(companyId);
  const save = useSetCompanySetting();
  const [values, setValues] = useState<Record<keyof OrderEditingSetting, string> | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const v = data?.["orders.editing"] as OrderEditingSetting | undefined;
    if (v) setValues({ lockAfterHours: String(v.lockAfterHours), hardLockAfterDays: String(v.hardLockAfterDays), cashierEditMinutes: String(v.cashierEditMinutes), cashierCorrectionMinutes: String(v.cashierCorrectionMinutes) });
  }, [data]);

  if (!values) return null;
  const parsed = Object.fromEntries(FIELDS.map((f) => [f.key, Number(values[f.key] || 0)])) as unknown as OrderEditingSetting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order editing</CardTitle>
        <CardDescription>How long this company&apos;s orders stay editable. Its owner sees the same values in their Settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={`oe-${f.key}`}>{f.label}</Label>
              <div className="flex items-center gap-2">
                <Input id={`oe-${f.key}`} inputMode="numeric" disabled={!allowed} value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value.replace(/\D/g, "") })} />
                <span className="text-sm text-muted-foreground">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
        {allowed && <Button variant="outline" onClick={() => setConfirm(true)}>Save order editing</Button>}
      </CardContent>
      <ConfirmWithReason
        open={confirm}
        onOpenChange={setConfirm}
        title="Change order editing"
        description="This changes the rules for everyone at this company. It is recorded as done by Fillo, with your reason."
        confirmLabel="Save"
        onConfirm={(reason) => save.mutateAsync({ id: companyId, key: "orders.editing", value: parsed, reason })}
      />
    </Card>
  );
}
