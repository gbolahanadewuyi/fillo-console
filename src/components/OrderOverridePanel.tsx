import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmWithReason } from "@/components/ConfirmWithReason";
import { useOverrideOrder, type ControlOrder } from "@/hooks/useControlApi";
import { naira } from "@/lib/format";

type Step = null | "edit" | "payment" | "customer";

/** Correct a company's order for it, past any lock. Same rules as the company's own edit (stock, invoice, refund or balance), recorded as done by Fillo. */
export function OrderOverridePanel({ order }: { order: ControlOrder }) {
  const api = useOverrideOrder(order.id);
  const [step, setStep] = useState<Step>(null);
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries(order.lines.map((l) => [l.productId, String(Number(l.quantity))])));
  const [reduction, setReduction] = useState<"CORRECTION" | "REFUND">("CORRECTION");
  const [paymentId, setPaymentId] = useState(order.payments[0]?.id ?? "");
  const [amount, setAmount] = useState(order.payments[0] ? String(Number(order.payments[0].amount)) : "");
  const [method, setMethod] = useState(order.payments[0]?.method ?? "CASH");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  if (order.status === "CANCELLED") return null;
  const lines = order.lines.map((l) => ({ productId: l.productId, quantity: qty[l.productId] ?? "" })).filter((l) => Number(l.quantity) > 0);
  const closeStep = (open: boolean) => !open && setStep(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Correct for the company</CardTitle>
        <CardDescription>Works on any order, however old. The company is told, and the change is recorded as done by Fillo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {order.lines.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 text-sm">
              <Label htmlFor={`q-${l.id}`}>{l.productName}</Label>
              <div className="flex items-center gap-2">
                <Input id={`q-${l.id}`} className="w-28 text-right" inputMode="decimal" value={qty[l.productId] ?? ""} onChange={(e) => setQty({ ...qty, [l.productId]: e.target.value.replace(/[^\d.]/g, "") })} />
                <span className="w-10 text-xs text-muted-foreground">{l.unit.toLowerCase()}</span>
              </div>
            </div>
          ))}
          {Number(order.paidTotal) > 0 && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">If the total falls below what was paid</span>
              <Select value={reduction} onValueChange={(v) => setReduction(v as "CORRECTION" | "REFUND")}>
                <SelectTrigger className="w-[260px]" aria-label="When the total falls"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORRECTION">Payment was recorded wrongly</SelectItem>
                  <SelectItem value="REFUND">Money was handed back</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="outline" size="sm" disabled={lines.length === 0} onClick={() => setStep("edit")}>Change quantities</Button>
        </div>

        {order.payments.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <Select value={paymentId} onValueChange={(id) => { setPaymentId(id); const p = order.payments.find((x) => x.id === id); if (p) { setAmount(String(Number(p.amount))); setMethod(p.method); } }}>
                <SelectTrigger aria-label="Payment"><SelectValue /></SelectTrigger>
                <SelectContent>{order.payments.map((p) => <SelectItem key={p.id} value={p.id}>{naira(p.amount)} · {p.method.replace("_", " ").toLowerCase()}</SelectItem>)}</SelectContent>
              </Select>
              <Input aria-label="Correct amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger aria-label="Correct method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="POS">POS</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" disabled={!paymentId || !Number(amount)} onClick={() => setStep("payment")}>Correct the payment</Button>
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input aria-label="Customer phone" placeholder="Customer phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input aria-label="Customer name" placeholder="Name (if new)" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" disabled={!phone.trim()} onClick={() => setStep("customer")}>Change the customer</Button>
        </div>
      </CardContent>

      <ConfirmWithReason
        open={step === "edit"}
        onOpenChange={closeStep}
        title={`Change order #${order.orderNumber}`}
        description="The order, its stock, invoice and balance are updated. The company is told, and it shows as done by Fillo."
        confirmLabel="Change order"
        onConfirm={(reason) => api.edit.mutateAsync({ lines, reason, ...(Number(order.paidTotal) > 0 ? { reduction: { kind: reduction } } : {}) })}
      />
      <ConfirmWithReason
        open={step === "payment"}
        onOpenChange={closeStep}
        title="Correct the payment"
        description="The wrong entry is reversed and the right one recorded. It shows as done by Fillo."
        confirmLabel="Correct payment"
        onConfirm={(reason) => api.correctPayment.mutateAsync({ paymentId, amount: Number(amount).toFixed(2), method, reason })}
      />
      <ConfirmWithReason
        open={step === "customer"}
        onOpenChange={closeStep}
        title="Change the customer"
        description="The order moves to this customer, who is created if new. It shows as done by Fillo."
        confirmLabel="Change customer"
        onConfirm={(reason) => api.changeCustomer.mutateAsync({ customerPhone: phone.trim(), ...(name.trim() ? { customerName: name.trim() } : {}), reason })}
      />
    </Card>
  );
}
