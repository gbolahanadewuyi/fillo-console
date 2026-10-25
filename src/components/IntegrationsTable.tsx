import { Link } from "react-router-dom";
import { useControlIntegrations } from "@/hooks/useControlApi";
import { lagos } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QueryError } from "@/components/QueryError";

/** Connections and their real health. With `companyId` it shows that company's only, and drops the company column. */
export function IntegrationsTable({ companyId }: { companyId?: string }) {
  const { data, isLoading, error, refetch } = useControlIntegrations();
  if (error) return <QueryError error={error} onRetry={() => void refetch()} what="integrations" />;
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const rows = (data ?? []).filter((i) => !companyId || i.companyId === companyId);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {!companyId && <TableHead>Company</TableHead>}
          <TableHead>Provider</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Connected</TableHead>
          <TableHead>Last success</TableHead>
          <TableHead>Last problem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((i) => (
          <TableRow key={i.id}>
            {!companyId && (
              <TableCell>
                {i.companyId ? (
                  <Link to={`/companies/${i.companyId}`} className="font-medium text-primary hover:underline">
                    {i.companyName}
                  </Link>
                ) : (
                  <span className="font-medium">{i.companyName}</span>
                )}
              </TableCell>
            )}
            <TableCell className="capitalize">{i.provider}</TableCell>
            <TableCell>
              <StatusBadge status={i.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{i.connectedAt ? new Date(i.connectedAt).toLocaleDateString() : "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{lagos(i.lastSuccessAt ?? i.lastWebhookAt)}</TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-[18rem] break-words">
              {i.lastFailureAt ? `${lagos(i.lastFailureAt)}${i.lastFailureDetail ? ` — ${i.lastFailureDetail}` : ""}` : "—"}
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={companyId ? 5 : 6} className="text-center py-6 text-muted-foreground">
              No integrations.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
