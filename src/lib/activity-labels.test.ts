import { describe, expect, it } from "vitest";
import { activityLabel } from "./activity-labels";

describe("activityLabel", () => {
  it("names the actions people see most in plain English", () => {
    expect(activityLabel("procurement.payment_recorded")).toBe("Purchase order payment recorded");
    expect(activityLabel("order.refunded")).toBe("Order refunded");
    expect(activityLabel("loading.voided")).toBe("Truck loading voided");
  });
  it("an action nobody has named yet is still readable, never a code", () => {
    expect(activityLabel("billing.invoice_paid")).toBe("Billing invoice paid");
    expect(activityLabel("")).toBe("");
  });
});
