import { describe, expect, it } from "vitest";
import { buildMilestones, elapsed, timeToComplete } from "./order-timeline";
import type { ControlOrder } from "@/hooks/useControlApi";

const base = {
  type: "DELIVERY", channel: "WHATSAPP", createdBy: "Ada", createdAt: "2026-10-20T10:00:00Z", payments: [], refunds: [], deliveries: [], timeline: [],
} as unknown as ControlOrder;

describe("elapsed", () => {
  it("reads as a person would say it", () => {
    expect(elapsed(20_000)).toBe("under a minute");
    expect(elapsed(45 * 60_000)).toBe("45 min");
    expect(elapsed(130 * 60_000)).toBe("2 h 10 min");
    expect(elapsed(120 * 60_000)).toBe("2 h");
    expect(elapsed((3 * 24 + 4) * 3_600_000)).toBe("3 d 4 h");
  });
});

describe("buildMilestones", () => {
  it("starts with the order being placed, from the order itself, and does not repeat the creation event", () => {
    const m = buildMilestones({ ...base, timeline: [{ id: "a1", action: "order.created", actorName: "Ada", createdAt: "2026-10-20T10:00:00Z", status: null, note: null }] });
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ label: "Placed", by: "Ada", detail: "Delivery via whatsapp", after: null });
  });

  it("puts payments, status changes, the rider and the delivery in the order they happened, each with the gap before it", () => {
    const m = buildMilestones({
      ...base,
      payments: [{ id: "p1", amount: "5000", method: "TRANSFER", reference: null, paidAt: "2026-10-20T10:05:00Z", recordedBy: "Ada", pos: null }],
      deliveries: [{ id: "d1", status: "DELIVERED", createdAt: "2026-10-20T10:00:00Z", assignedAt: "2026-10-20T10:30:00Z", completedAt: "2026-10-20T12:10:00Z", riderName: "Ibrahim" }],
      timeline: [
        { id: "a3", action: "order.status_changed", actorName: "Chidi", createdAt: "2026-10-20T12:15:00Z", status: "COMPLETED", note: null },
        { id: "a2", action: "order.status_changed", actorName: "Ada", createdAt: "2026-10-20T10:20:00Z", status: "PREPARING", note: null },
      ],
    } as never);
    expect(m.map((x) => x.label)).toEqual(["Placed", "Payment received", "Being prepared", "Assigned to Ibrahim", "Delivered", "Completed"]);
    expect(m[1]).toMatchObject({ by: "Ada", detail: expect.stringContaining("transfer"), after: 5 * 60_000 });
    expect(m[3]!.after).toBe(10 * 60_000);
  });

  it("a cancellation shows who, and why; a refund shows how much", () => {
    const m = buildMilestones({
      ...base,
      refunds: [{ id: "r1", amount: "100", method: "CASH", reason: "wrong size", createdAt: "2026-10-20T11:00:00Z" }],
      timeline: [
        { id: "a1", action: "order.cancelled", actorName: "Ada", createdAt: "2026-10-20T10:59:00Z", status: null, note: "customer changed their mind" },
        { id: "a2", action: "order.refunded", actorName: "Ada", createdAt: "2026-10-20T11:00:00Z", status: null, note: null },
      ],
    } as never);
    expect(m.map((x) => x.label)).toEqual(["Placed", "Cancelled", "Refunded"]); // the refund appears once, from its own record
    expect(m[1]).toMatchObject({ by: "Ada", detail: "customer changed their mind" });
    expect(m[2]!.detail).toContain("wrong size");
  });

  it("an event nobody has named still shows, readable", () => {
    const m = buildMilestones({ ...base, timeline: [{ id: "a1", action: "invoice.issued", actorName: "Ada", createdAt: "2026-10-20T10:40:00Z", status: null, note: null }] });
    expect(m[1]!.label).toBe("Invoice issued");
  });
});

describe("timeToComplete", () => {
  it("is the time from placed to the first completion, and null while the order is open", () => {
    const open = buildMilestones(base);
    expect(timeToComplete(base, open)).toBeNull();
    const done = { ...base, timeline: [{ id: "a", action: "order.status_changed", actorName: null, createdAt: "2026-10-20T12:10:00Z", status: "COMPLETED", note: null }] } as ControlOrder;
    expect(timeToComplete(done, buildMilestones(done))).toBe(130 * 60_000);
  });
});
