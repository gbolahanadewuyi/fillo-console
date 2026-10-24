import { useControlIntegrations } from "@/hooks/useControlApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { QueryError } from "@/components/QueryError";
import { JobsPanel } from "@/components/JobsPanel";

export default function Integrations() {
  const { data, isLoading, error, refetch } = useControlIntegrations();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">Provider connections per company. Credentials are never shown.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Integration health</CardTitle>
          <CardDescription>Health comes from what each connection actually did in the last 7 days: "Unknown" means nothing happened, not that it works. Failing means the latest call failed; Unreliable means it works now but failed in the last day.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <QueryError error={error} onRetry={() => void refetch()} what="integrations" />
          ) : isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead>Last success</TableHead>
                  <TableHead>Last problem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      {i.companyId ? (
                        <Link to={`/companies/${i.companyId}`} className="font-medium text-primary hover:underline">
                          {i.companyName}
                        </Link>
                      ) : (
                        <span className="font-medium">{i.companyName}</span>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{i.provider}</TableCell>
                    <TableCell>
                      <StatusBadge status={i.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.connectedAt ? new Date(i.connectedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.lastSuccessAt ? new Date(i.lastSuccessAt).toLocaleString() : i.lastWebhookAt ? new Date(i.lastWebhookAt).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[18rem] break-words">
                      {i.lastFailureAt ? `${new Date(i.lastFailureAt).toLocaleString()}${i.lastFailureDetail ? ` — ${i.lastFailureDetail}` : ""}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {(data?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No integrations.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

        </CardContent>
      </Card>
      <JobsPanel />
    </div>
  );
}
