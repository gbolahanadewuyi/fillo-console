import { Link } from "react-router-dom";
import { QueryError } from "@/components/QueryError";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttentionItem } from "@/hooks/useControlApi";

/** What kind of problem an item is: a customer's business (a company suspended or overdue) or the platform itself. */
export const BUSINESS_KINDS: AttentionItem["kind"][] = ["company_suspended", "company_past_due"];
export const PLATFORM_KINDS: AttentionItem["kind"][] = ["integration", "rejected_webhooks", "job", "outbox"];

function Row({ item }: { item: AttentionItem }) {
  const body = (
    <div className="flex items-start gap-3 rounded border px-3 py-2">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.severity === "critical" ? "bg-red-500" : "bg-amber-500"}`} aria-label={item.severity} />
      <div className="min-w-0">
        <div className="text-sm font-medium leading-snug">{item.title}</div>
        <div className="text-xs text-muted-foreground break-words">{item.detail}</div>
      </div>
    </div>
  );
  const to = item.companyId ? `/companies/${item.companyId}` : PLATFORM_KINDS.includes(item.kind) ? "/integrations" : undefined;
  return to ? (
    <Link to={to} className="block hover:bg-muted/50 rounded">
      {body}
    </Link>
  ) : (
    body
  );
}

/** The attention feed narrowed to `kinds`, worst first (the API already orders it), with its own loading, error and empty states. */
export function AttentionList({ items, error, kinds, limit = 8 }: { items: AttentionItem[] | undefined; error: unknown; kinds: AttentionItem["kind"][]; limit?: number }) {
  if (error) return <QueryError error={error} what="the attention list" />;
  if (items === undefined) return <Skeleton className="h-16 w-full" />;
  const shown = items.filter((i) => kinds.includes(i.kind));
  if (shown.length === 0) return <p className="text-sm text-muted-foreground">Nothing is flagged.</p>;
  const critical = shown.some((i) => i.severity === "critical");
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{critical ? "Something is failing" : "Nothing is failing, but look at these"}</p>
      {shown.slice(0, limit).map((item) => (
        <Row key={item.id} item={item} />
      ))}
      {shown.length > limit && <p className="text-xs text-muted-foreground">and {shown.length - limit} more</p>}
    </div>
  );
}
