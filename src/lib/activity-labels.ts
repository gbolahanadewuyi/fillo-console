/**
 * Plain-English names for the actions the apps record, shown wherever activity is listed. The raw code stays on the row
 * (as a tooltip, and searchable) because it is what support greps for; an action with no entry is made readable from its
 * own name, so a new action never shows as a code or breaks the page.
 */
const LABELS: Record<string, string> = {
  "automation.whatsapp_number_requested": "WhatsApp number requested",
  "channel_session.payment_claimed": "Customer said they paid on WhatsApp",
  "company.branding_updated": "Branding changed",
  "company.suspended": "Company suspended",
  "company.unsuspended": "Company reactivated",
  "company.test_flag_updated": "Test-company flag changed",
  "customer.created": "Customer added",
  "customer.updated": "Customer changed",
  "delivery.rider_assigned": "Rider assigned",
  "delivery.status_changed": "Delivery status changed",
  "expense.approved": "Expense approved",
  "expense.created": "Expense recorded",
  "expense.rejected": "Expense rejected",
  "expense.updated": "Expense changed",
  "invite.accepted": "Invitation accepted",
  "invite.created": "Invitation sent",
  "invite.resend": "Invitation resent",
  "invite.revoked": "Invitation cancelled",
  "invoice.issued": "Invoice issued",
  "invoice.voided": "Invoice voided",
  "loading.recorded": "Truck loading recorded",
  "loading.voided": "Truck loading voided",
  "order.cancelled": "Order cancelled",
  "order.created": "Order created",
  "order.payment_recorded": "Payment recorded on an order",
  "order.refunded": "Order refunded",
  "order.status_changed": "Order status changed",
  "order_intake.converted": "Request turned into an order",
  "order_intake.dismissed": "Request dismissed",
  "order_intake.logged": "Request logged",
  "platform.feature_flag_updated": "Feature switch changed",
  "platform.outbox_retried": "Stuck notifications retried",
  "platform.whatsapp_number_updated": "WhatsApp number updated",
  "pos_provider.webhook_token_regenerated": "Payment provider address changed",
  "pos_transaction.ingested": "Provider payment received",
  "pos_transaction.matched": "Provider payment matched to an order",
  "pos_transaction.status_changed": "Provider payment status changed",
  "pos_transaction.unmatched": "Provider payment unmatched",
  "procurement.created": "Purchase order created",
  "procurement.line_received": "Stock received on a purchase order",
  "procurement.payment_recorded": "Purchase order payment recorded",
  "product.created": "Product added",
  "product.updated": "Product changed",
  "rider.created": "Rider added",
  "rider.deleted": "Rider removed",
  "rider.updated": "Rider changed",
  "role.created": "Role created",
  "role.deleted": "Role deleted",
  "role.updated": "Role changed",
  "setting.updated": "Setting changed",
  "station.created": "Station added",
  "station.updated": "Station changed",
  "stock.counted": "Stock counted",
  "supplier.created": "Supplier added",
  "supplier.updated": "Supplier changed",
  "tank.created": "Tank added",
  "tank.updated": "Tank changed",
  "user.created": "Person added",
  "user.unlock": "Sign-in unlocked",
  "user.updated": "Person changed",
};

export function activityLabel(action: string): string {
  const known = LABELS[action];
  if (known) return known;
  const text = action.replace(/[._]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : action;
}
