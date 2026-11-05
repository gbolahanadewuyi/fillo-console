import { Link } from "react-router-dom";
import { useControlCompanies, type ControlCompany } from "@/hooks/useControlApi";
import { apiValue, useTableState } from "@/hooks/useTableState";
import { DataTable, SearchBox, type Column } from "@/components/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { usePageSize } from "@/lib/page-size";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { NewCompanyDialog } from "@/components/NewCompanyDialog";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";

const COLUMNS: Column<ControlCompany>[] = [
  {
    key: "name",
    header: "Company",
    sortKey: "name",
    cell: (c) => (
      <>
        <Link to={`/companies/${c.id}`} className="font-medium hover:underline">
          {c.name}
        </Link>
        {c.isTest && <span className="ml-2 rounded border px-1.5 py-0.5 text-xs text-muted-foreground">Test</span>}
        {c.industry && <div className="text-xs text-muted-foreground">{c.industry}</div>}
      </>
    ),
  },
  { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
  { key: "stations", header: "Stations", cell: (c) => c.stationCount },
  { key: "users", header: "Users", cell: (c) => c.userCount },
  { key: "plan", header: "Plan", secondary: true, cell: (c) => c.planName ?? "—" },
  { key: "created", header: "Created", sortKey: "createdAt", secondary: true, className: "text-sm text-muted-foreground", cell: (c) => new Date(c.createdAt).toLocaleDateString() },
];

export default function Companies() {
  const pageSize = usePageSize();
  const t = useTableState();
  const { data, isLoading, error, refetch } = useControlCompanies({ page: t.page, pageSize, search: t.filter("search"), status: apiValue(t.filter("status")), sort: t.sort });

  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">Every company on the Fillo platform.</p>
        </div>
        {can(user?.platformRole, "company.create") && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> New company
          </Button>
        )}
      </div>
      <NewCompanyDialog open={creating} onOpenChange={setCreating} />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <SearchBox value={t.filter("search")} onChange={(v) => t.setFilter("search", v)} placeholder="Search by name…" />
            <Select value={t.filter("status") || "all"} onValueChange={(v) => t.setFilter("status", v)}>
              <SelectTrigger className="w-[180px]" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="past_due">Past due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={COLUMNS}
            rows={data?.data}
            rowKey={(c) => c.id}
            what="companies"
            empty="No companies found."
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
