import { useState } from "react";
import { useControlJobs, useRetryOutbox } from "@/hooks/useControlApi";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { QueryError } from "@/components/QueryError";
import { ConfirmWithReason } from "@/components/ConfirmWithReason";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

/** The background jobs and the notification queue: when each last ran, why one failed, and what is stuck. */
export function JobsPanel() {
  const { data, error, isLoading, refetch } = useControlJobs();
  const { user } = useAuth();
  const { toast } = useToast();
  const retry = useRetryOutbox();
  const [confirming, setConfirming] = useState(false);
  const canRetry = can(user?.platformRole, "outbox.retry");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Background jobs</CardTitle>
        <CardDescription>Each run is recorded. "Stopped" means the job works but hasn't run when it should have.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <QueryError error={error} onRetry={() => void refetch()} what="the jobs" />
        ) : isLoading || !data ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead>Last success</TableHead>
                  <TableHead>Last error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.jobs.map((j) => (
                  <TableRow key={j.job}>
                    <TableCell className="font-mono text-xs">{j.job}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{j.schedule}</TableCell>
                    <TableCell>
                      <StatusBadge status={j.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{when(j.lastRunAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{when(j.lastSuccessAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[18rem] break-words">{j.lastError ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded border px-3 py-2 text-sm">
              <div>
                <span className="font-medium">Notification queue:</span> {data.outbox.pending} waiting
                {data.outbox.stuck > 0 ? `, ${data.outbox.stuck} stuck for over 15 minutes` : ""}
                {data.outbox.lastError && data.outbox.stuck > 0 ? <div className="text-xs text-muted-foreground">Last error: {data.outbox.lastError}</div> : null}
              </div>
              {canRetry && data.outbox.stuck > 0 && (
                <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
                  Retry stuck events
                </Button>
              )}
            </div>
            <ConfirmWithReason
              open={confirming}
              onOpenChange={setConfirming}
              title="Retry stuck notification events?"
              description="Events that have waited over 15 minutes are delivered again. Events already delivered are never sent twice. This is recorded in the audit trail."
              confirmLabel="Retry now"
              onConfirm={async (reason) => {
                const { retried } = await retry.mutateAsync({ reason });
                toast({ title: "Retried", description: `${retried} event${retried === 1 ? "" : "s"} delivered again.` });
              }}
            />

            {data.recentFailures.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent failed runs</div>
                <div className="space-y-1">
                  {data.recentFailures.map((f) => (
                    <div key={f.id} className="text-sm">
                      <span className="font-mono text-xs">{f.job}</span> <span className="text-muted-foreground">• {when(f.startedAt)}</span>
                      <div className="text-xs text-muted-foreground break-words">{f.error ?? "No error recorded."}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
