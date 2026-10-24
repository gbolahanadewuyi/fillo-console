import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/services/api";

/** What a failed request looks like: the real reason and a retry, in place of the page's data. */
export function QueryError({ error, onRetry, what = "this data" }: { error: unknown; onRetry?: () => void; what?: string }) {
  const message =
    error instanceof ApiError
      ? error.status === 403
        ? "Your role doesn't include this."
        : error.message
      : error instanceof Error
        ? error.message
        : "Something went wrong.";
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="flex-1">
        <p className="font-medium">Couldn't load {what}</p>
        <p className="mt-0.5 text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
