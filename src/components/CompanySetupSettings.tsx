import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmWithReason } from "@/components/ConfirmWithReason";
import { useCompanySettings, useSetCompanySetting } from "@/hooks/useControlApi";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { can } from "@/lib/permissions";
import { hoursFromWeek, weekOf, WEEKDAYS, type BusinessHours, type DayHours, type WeekdayKey } from "@/lib/business-hours";

/** "one per line" or comma separated, trimmed, without blanks or repeats. */
export function parseCategories(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,]/)) {
    const name = raw.trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      out.push(name);
    }
  }
  return out;
}

const MONEY = /^\d+(\.\d{1,2})?$/;

/** A card whose Save asks for a reason first, like every platform change. */
function Section({ title, description, valid, onSave, children }: { title: string; description?: string; valid: boolean; onSave: (reason: string) => Promise<unknown>; children: React.ReactNode }) {
  const { user } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const { toast } = useToast();
  const editable = can(user?.platformRole, "company.override");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset disabled={!editable} className="space-y-4">{children}</fieldset>
        {editable && <Button variant="outline" disabled={!valid} onClick={() => setConfirm(true)}>Save {title.toLowerCase()}</Button>}
      </CardContent>
      <ConfirmWithReason
        open={confirm}
        onOpenChange={setConfirm}
        title={`Save ${title.toLowerCase()}`}
        description="This changes the company's settings. It is recorded as done by Fillo, with your reason."
        confirmLabel="Save"
        onConfirm={async (reason) => {
          await onSave(reason);
          toast({ title: `${title} saved` });
        }}
      />
    </Card>
  );
}

type Bank = { bankName: string; accountName: string; accountNumber: string; notes?: string };

/** What the company's WhatsApp customers are told to pay into. */
function PaymentAccount({ companyId, value }: { companyId: string; value: Bank }) {
  const save = useSetCompanySetting();
  const [bank, setBank] = useState<Bank>({ bankName: "", accountName: "", accountNumber: "", notes: "" });
  useEffect(() => setBank({ bankName: value.bankName ?? "", accountName: value.accountName ?? "", accountNumber: value.accountNumber ?? "", notes: value.notes ?? "" }), [value]);
  const valid = !!bank.bankName.trim() && !!bank.accountName.trim() && !!bank.accountNumber.trim();
  const field = (id: keyof Bank, label: string) => (
    <div className="space-y-2">
      <Label htmlFor={`bank-${id}`}>{label}</Label>
      <Input id={`bank-${id}`} value={bank[id] ?? ""} onChange={(e) => setBank({ ...bank, [id]: e.target.value })} />
    </div>
  );
  return (
    <Section
      title="Payment account"
      description="Shown to WhatsApp customers when they are asked to pay by transfer."
      valid={valid}
      onSave={(reason) => save.mutateAsync({ id: companyId, key: "payment.bank_details", reason, value: { bankName: bank.bankName.trim(), accountName: bank.accountName.trim(), accountNumber: bank.accountNumber.trim(), ...(bank.notes?.trim() ? { notes: bank.notes.trim() } : {}) } })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {field("bankName", "Bank or provider")}
        {field("accountName", "Account name")}
        {field("accountNumber", "Account number")}
        {field("notes", "Note (optional)")}
      </div>
    </Section>
  );
}

/** The most anyone but the owner can approve in expenses. A role can have its own limit instead. */
function ExpenseLimit({ companyId, value }: { companyId: string; value: string | null }) {
  const save = useSetCompanySetting();
  const [limit, setLimit] = useState("");
  useEffect(() => setLimit(value ?? ""), [value]);
  const valid = limit.trim() === "" || MONEY.test(limit.trim());
  return (
    <Section
      title="Expense approval limit"
      description="Expenses above this wait for the owner (or a role with a higher limit). Leave empty for no limit."
      valid={valid}
      onSave={(reason) => save.mutateAsync({ id: companyId, key: "expense.default_approval_limit", reason, value: limit.trim() === "" ? null : Number(limit.trim()).toFixed(2) })}
    >
      <div className="space-y-2">
        <Label htmlFor="expense-limit">Limit (₦)</Label>
        <Input id="expense-limit" className="max-w-xs" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^\d.]/g, ""))} aria-invalid={!valid} />
      </div>
    </Section>
  );
}

function ExpenseCategories({ companyId, value }: { companyId: string; value: string[] }) {
  const save = useSetCompanySetting();
  const [text, setText] = useState("");
  useEffect(() => setText(value.join("\n")), [value]);
  const list = parseCategories(text);
  return (
    <Section
      title="Expense categories"
      description="One per line. Staff can still add a new one when recording an expense."
      valid={list.length > 0}
      onSave={(reason) => save.mutateAsync({ id: companyId, key: "expense.categories", reason, value: list })}
    >
      <div className="space-y-2">
        <Label htmlFor="expense-categories">Categories</Label>
        <Textarea id="expense-categories" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
    </Section>
  );
}

function TradingHours({ companyId, value }: { companyId: string; value: BusinessHours }) {
  const save = useSetCompanySetting();
  const [week, setWeek] = useState<Record<WeekdayKey, DayHours>>(() => weekOf(value));
  useEffect(() => setWeek(weekOf(value)), [value]);
  const set = (key: WeekdayKey, next: DayHours) => setWeek({ ...week, [key]: next });
  const valid = WEEKDAYS.every((d) => { const h = week[d.key]; return h === null || (/^\d{2}:\d{2}$/.test(h.open) && /^\d{2}:\d{2}$/.test(h.close)); });
  return (
    <Section title="Trading hours" description="When the business trades, day by day. A day can be closed." valid={valid} onSave={(reason) => save.mutateAsync({ id: companyId, key: "business.hours", reason, value: hoursFromWeek(week) })}>
      <div className="space-y-2">
        {WEEKDAYS.map((d) => {
          const h = week[d.key];
          return (
            <div key={d.key} className="grid grid-cols-[6rem_6rem_1fr_1fr] items-center gap-3">
              <span className="text-sm font-medium">{d.label}</span>
              <div className="flex items-center gap-2">
                <Switch checked={h !== null} onCheckedChange={(on) => set(d.key, on ? { open: "08:00", close: "18:00" } : null)} aria-label={`${d.label} open`} />
                <span className="text-sm text-muted-foreground">{h ? "Open" : "Closed"}</span>
              </div>
              {h && (
                <>
                  <Input type="time" aria-label={`${d.label} opens`} value={h.open} onChange={(e) => set(d.key, { ...h, open: e.target.value })} />
                  <Input type="time" aria-label={`${d.label} closes`} value={h.close} onChange={(e) => set(d.key, { ...h, close: e.target.value })} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** The things a new company needs set before it opens, entered by Fillo staff from the console instead of by the owner. */
export function CompanySetupSettings({ companyId }: { companyId: string }) {
  const { data } = useCompanySettings(companyId);
  if (!data) return null;
  return (
    <div className="space-y-4">
      <PaymentAccount companyId={companyId} value={(data["payment.bank_details"] as Bank | undefined) ?? { bankName: "", accountName: "", accountNumber: "" }} />
      <ExpenseLimit companyId={companyId} value={(data["expense.default_approval_limit"] as string | null) ?? null} />
      <ExpenseCategories companyId={companyId} value={(data["expense.categories"] as string[]) ?? []} />
      <TradingHours companyId={companyId} value={(data["business.hours"] as BusinessHours | undefined) ?? { open: "08:00", close: "18:00" }} />
    </div>
  );
}
