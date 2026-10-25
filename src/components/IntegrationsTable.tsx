import { useState } from "react";
import { Link } from "react-router-dom";
import { useControlIntegrations, type IntegrationHealth } from "@/hooks/useControlApi";
import { lagos } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, type Column } from "@/components/DataTable";

/** Worst first, so a sort by health puts what needs a look at the top. */
const SEVERITY: Record<string, number> = { error: 0, degraded: 1, unknown: 2, disconnected: 3, healthy: 4 };
const SORTERS: Record<string, (a: IntegrationHealth, b: IntegrationHealth) => number> = {
  company: (a, b) => a.companyName.localeCompare(b.companyName),
  provider: (a, b) => a.provider.localeCompare(b.provider),
  status: (a, b) => (SEVERITY[a.status] ?? 9) - (SEVERITY[b.status] ?? 9),
};

/** Connections and their real health. With `companyId` it shows that company's only, and drops the company column. The list is small, so it sorts here. */
export function IntegrationsTable({ companyId }: { companyId?: string }) {
  const { data, isLoading, error, refetch } = useControlIntegrations();
  const [sort, setSort] = useState<string | undefined>();
  const [key, dir] = (sort ?? "").split(":");
  const rows = (data ?? []).filter((i) => !companyId || i.companyId === companyId);
  if (SORTERS[key!]) rows.sort((a, b) => SORTERS[key!]!(a, b) * (dir === "desc" ? -1 : 1));

  const columns: Column<IntegrationHealth>[] = [
    ...(companyId
      ? []
      : [
          {
            key: "company",
            header: "Company",
            sortKey: "company",
            cell: (i: IntegrationHealth) =>
              i.companyId ? (
                <Link to={`/companies/${i.companyId}`} className="font-medium text-primary hover:underline">
                  {i.companyName}
                </Link>
              ) : (
                <span className="font-medium">{i.companyName}</span>
              ),
          },
        ]),
    { key: "provider", header: "Provider", sortKey: "provider", className: "capitalize", cell: (i) => i.provider },
    { key: "status", header: "Status", sortKey: "status", cell: (i) => <StatusBadge status={i.status} /> },
    { key: "connected", header: "Connected", secondary: true, className: "text-sm text-muted-foreground", cell: (i) => (i.connectedAt ? new Date(i.connectedAt).toLocaleDateString() : "—") },
    { key: "success", header: "Last success", secondary: true, className: "text-sm text-muted-foreground", cell: (i) => lagos(i.lastSuccessAt ?? i.lastWebhookAt) },
    {
      key: "problem",
      header: "Last problem",
      className: "text-sm text-muted-foreground max-w-[18rem] break-words",
      cell: (i) => (i.lastFailureAt ? `${lagos(i.lastFailureAt)}${i.lastFailureDetail ? ` — ${i.lastFailureDetail}` : ""}` : "—"),
    },
  ];

  return <DataTable columns={columns} rows={rows} rowKey={(i) => i.id} what="integrations" empty="No integrations." loading={isLoading} error={error} onRetry={() => void refetch()} sort={sort} onSortChange={setSort} />;
}
