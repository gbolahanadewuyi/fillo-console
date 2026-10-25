import { Link } from "react-router-dom";
import { useControlStations, type ControlStation } from "@/hooks/useControlApi";
import { useTableState } from "@/hooks/useTableState";
import { DataTable, SearchBox, type Column } from "@/components/DataTable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const COLUMNS: Column<ControlStation>[] = [
  { key: "name", header: "Station", sortKey: "name", className: "font-medium", cell: (s) => s.name },
  {
    key: "company",
    header: "Company",
    cell: (s) => (
      <Link to={`/companies/${s.companyId}`} className="text-primary hover:underline">
        {s.companyName ?? s.companyId}
      </Link>
    ),
  },
  { key: "address", header: "Address", secondary: true, className: "text-sm text-muted-foreground", cell: (s) => s.address ?? "—" },
  { key: "users", header: "Users", cell: (s) => s.userCount ?? "—" },
  { key: "created", header: "Created", sortKey: "createdAt", secondary: true, className: "text-sm text-muted-foreground", cell: (s) => new Date(s.createdAt).toLocaleDateString() },
];

export default function Stations() {
  const t = useTableState();
  const { data, isLoading, error, refetch } = useControlStations({ page: t.page, pageSize: 20, search: t.filter("search"), sort: t.sort });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stations</h1>
        <p className="text-sm text-muted-foreground">Every station across all companies. Open a company to see its own.</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="max-w-sm">
            <SearchBox value={t.filter("search")} onChange={(v) => t.setFilter("search", v)} placeholder="Search stations…" />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={COLUMNS}
            rows={data?.data}
            rowKey={(s) => s.id}
            what="stations"
            loading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            pagination={data}
            onPageChange={t.setPage}
            sort={t.sort}
            onSortChange={t.setSort}
          />
        </CardContent>
      </Card>
    </div>
  );
}
