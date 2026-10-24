import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useControlOrder } from "@/hooks/useControlApi";
import { naira, lagos, words } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { QueryError } from "@/components/QueryError";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{children}</span>
    </div>
  );
}

const Back = () => (
  <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
    <ArrowLeft className="h-4 w-4" /> Orders
  </Link>
);

export default function OrderDetail() {
  const { id } = useParams();
  const { data: o, error, refetch } = useControlOrder(id);

  if (error) {
    return (
      <div className="space-y-4">
        <Back />
        <QueryError error={error} onRetry={() => void refetch()} what="this order" />
      </div>
    );
  }
  if (!o) return <Back />;
  const owed = Number(o.balanceDue);

  return (
    <div className="space-y-4">
      <Back />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order #{o.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            <Link to={`/companies/${o.companyId}`} className="text-primary hover:underline">{o.companyName}</Link> · {o.stationName} · {words(o.type)} via {words(o.channel)} · {lagos(o.createdAt)}
            {o.createdBy ? ` · ${o.createdBy}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={o.status} />
          <StatusBadge status={o.paymentStatus} />
        </div>
      </div>
      {o.deletedAt && <p role="alert" className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">This order was deleted on {lagos(o.deletedAt)}.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Money</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row label="Subtotal">{naira(o.subtotal)}</Row>
            {Number(o.discount) > 0 && <Row label="Discount">−{naira(o.discount)}</Row>}
            {Number(o.vatAmount) > 0 && <Row label="VAT">{naira(o.vatAmount)}</Row>}
            <Row label="Total">{naira(o.total)}</Row>
            <Row label="Paid">{naira(o.paidTotal)}</Row>
            {Number(o.refundedTotal) > 0 && <Row label="Refunded">{naira(o.refundedTotal)}</Row>}
            <Row label="Still owed">
              <span className={owed !== 0 ? "text-amber-700" : undefined}>{naira(o.balanceDue)}</span>
            </Row>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Customer and source</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row label="Customer">{o.customer ? `${o.customer.name}${o.customer.phone ? ` · ${o.customer.phone}` : ""}` : "Walk-in"}</Row>
            {o.invoice && <Row label="Invoice">#{o.invoice.invoiceNumber}</Row>}
            {o.deliveries.map((d) => <Row key={d.id} label="Delivery"><StatusBadge status={d.status} /></Row>)}
            {o.intake && (
              <div className="rounded border p-2 text-sm">
                <div className="text-xs text-muted-foreground">Came in by {words(o.intake.channel)} ({o.intake.source.toLowerCase()}), {lagos(o.intake.createdAt)}</div>
                <div className="mt-1 whitespace-pre-wrap">{o.intake.messageText}</div>
              </div>
            )}
            {o.notes && <Row label="Notes">{o.notes}</Row>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {o.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.productName}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(l.quantity)} {l.unit.toLowerCase()}</TableCell>
                  <TableCell className="text-right tabular-nums">{naira(l.unitPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums">{naira(l.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Payments and refunds</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {o.payments.length === 0 && o.refunds.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded.</p>}
            {o.payments.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium">{words(p.method)}{p.reference ? ` · ${p.reference}` : ""}</div>
                  <div className="text-xs text-muted-foreground">
                    {lagos(p.paidAt)}{p.recordedBy ? ` · ${p.recordedBy}` : ""}
                    {p.pos ? ` · matched to ${words(p.pos.provider)} ${p.pos.externalReference}` : ""}
                  </div>
                </div>
                <span className="tabular-nums">{naira(p.amount)}</span>
              </div>
            ))}
            {o.refunds.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium">Refund · {words(r.method)}</div>
                  <div className="text-xs text-muted-foreground">{lagos(r.createdAt)}{r.reason ? ` · ${r.reason}` : ""}</div>
                </div>
                <span className="tabular-nums">−{naira(r.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Stock moved</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {o.movements.length === 0 && <p className="text-sm text-muted-foreground">This order did not move any stock.</p>}
            {o.movements.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium">{m.productName}</div>
                  <div className="text-xs text-muted-foreground">{words(m.type)} · {lagos(m.createdAt)}</div>
                </div>
                <span className="tabular-nums">{Number(m.quantity)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
        <CardContent>
          {o.timeline.length === 0 && <p className="text-sm text-muted-foreground">Nothing recorded.</p>}
          <ul className="divide-y">
            {o.timeline.map((t) => (
              <li key={t.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="font-mono text-xs">{t.action}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{t.actorName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{lagos(t.createdAt)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
