import { activityLabel } from "@/lib/activity-labels";
import { naira, words } from "@/lib/format";
import type { ControlOrder } from "@/hooks/useControlApi";

/** One thing that happened to an order, with who did it and how long after the step before. */
export interface Milestone {
  key: string;
  label: string;
  at: string;
  by: string | null;
  detail: string | null;
  /** Milliseconds since the previous milestone; null for the first. */
  after: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Marked paid",
  PREPARING: "Being prepared",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DRAFT: "Back to draft",
};

/** "45 min", "2 h 10 min", "3 d 4 h": the gap between two steps, never more precise than it is useful. */
export function elapsed(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
  const days = Math.floor(hours / 24);
  return `${days} d${hours % 24 ? ` ${hours % 24} h` : ""}`;
}

/**
 * The order's story in the order it happened: placed, paid, prepared, sent out, delivered, completed or cancelled,
 * built from what was recorded (the activity log, its payments, refunds and delivery). There is no separate
 * "confirmed" step in the product: an order is confirmed by its first payment or by being prepared.
 * "Placed" comes from the order itself, so the creation event in the log is not repeated.
 */
export function buildMilestones(o: ControlOrder): Milestone[] {
  const raw: Omit<Milestone, "after">[] = [{ key: "placed", label: "Placed", at: o.createdAt, by: o.createdBy, detail: `${words(o.type)} via ${words(o.channel).toLowerCase()}` }];

  for (const p of o.payments) {
    raw.push({ key: `pay:${p.id}`, label: "Payment received", at: p.paidAt, by: p.recordedBy, detail: `${naira(p.amount)} by ${words(p.method).toLowerCase()}${p.pos ? ` (${words(p.pos.provider)} matched)` : ""}` });
  }
  for (const r of o.refunds) raw.push({ key: `refund:${r.id}`, label: "Refunded", at: r.createdAt, by: null, detail: `${naira(r.amount)}${r.reason ? `: ${r.reason}` : ""}` });
  for (const d of o.deliveries) {
    if (d.assignedAt) raw.push({ key: `assign:${d.id}`, label: d.riderName ? `Assigned to ${d.riderName}` : "Rider assigned", at: d.assignedAt, by: null, detail: null });
    if (d.completedAt) raw.push({ key: `done:${d.id}`, label: d.status === "DELIVERED" ? "Delivered" : `Delivery ${words(d.status).toLowerCase()}`, at: d.completedAt, by: null, detail: d.riderName });
  }
  for (const t of o.timeline) {
    if (t.action === "order.created" || t.action === "order.payment_recorded" || t.action === "order.refunded") continue; // already shown from the order, its payments and its refunds
    if (t.action === "order.status_changed" && t.status) raw.push({ key: t.id, label: STATUS_LABEL[t.status] ?? words(t.status), at: t.createdAt, by: t.actorName, detail: null });
    else if (t.action === "order.cancelled") raw.push({ key: t.id, label: "Cancelled", at: t.createdAt, by: t.actorName, detail: t.note });
    else raw.push({ key: t.id, label: activityLabel(t.action), at: t.createdAt, by: t.actorName, detail: t.note });
  }

  raw.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return raw.map((m, i) => ({ ...m, after: i === 0 ? null : new Date(m.at).getTime() - new Date(raw[i - 1]!.at).getTime() }));
}

/** From placed to the first completion (the order completed, or its delivery delivered): null while it is still open. */
export function timeToComplete(o: ControlOrder, milestones: Milestone[]): number | null {
  const end = milestones.find((m) => m.label === "Completed" || m.label === "Delivered");
  return end ? new Date(end.at).getTime() - new Date(o.createdAt).getTime() : null;
}
