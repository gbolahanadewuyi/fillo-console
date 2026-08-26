import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

const statusMap: Record<string, { label: string; variant: Variant }> = {
  // company / subscription
  trial: { label: "Trial", variant: "warning" },
  trialing: { label: "Trial", variant: "warning" },
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "destructive" },
  archived: { label: "Archived", variant: "muted" },
  past_due: { label: "Past due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "muted" },
  // user
  // integration
  connected: { label: "Connected", variant: "success" },
  disconnected: { label: "Disconnected", variant: "muted" },
  error: { label: "Error", variant: "destructive" },
  healthy: { label: "Healthy", variant: "success" },
  degraded: { label: "Degraded", variant: "warning" },
  // generic
  pending: { label: "Pending", variant: "warning" },
  failed: { label: "Failed", variant: "destructive" },
  enabled: { label: "Enabled", variant: "success" },
  disabled: { label: "Disabled", variant: "muted" },
};

const variantClass: Record<Variant, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  destructive: "bg-red-500/10 text-red-700 border-red-500/20",
  muted: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  const mapped = statusMap[key] ?? { label: status, variant: "default" as Variant };
  return (
    <Badge variant="outline" className={cn("font-medium text-xs border", variantClass[mapped.variant], className)}>
      {mapped.label}
    </Badge>
  );
}
