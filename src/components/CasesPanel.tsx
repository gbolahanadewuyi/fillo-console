import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { useControlCases, type ControlCaseRow } from "@/hooks/useControlApi";
import { apiValue, useTableState } from "@/hooks/useTableState";
import { lagos } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, type Column } from "@/components/DataTable";
import { NewCaseDialog, type CaseDefaults } from "@/components/NewCaseDialog";

/** Cases, open ones first. With `companyId` it is that company's only, and its state stays in memory (it sits in a tab). */
export function CasesPanel({ companyId, startOpen = false, defaults }: { companyId?: string; startOpen?: boolean; defaults?: CaseDefaults }) {
  const { user } = useAuth();
  const t = useTableState({ filters: { status: "OPEN" }, syncUrl: !companyId });
  const [creating, setCreating] = useState(startOpen);
  const { data, isLoading, error, refetch } = useControlCases({ page: t.page, pageSize: 20, companyId, status: apiValue(t.filter("status")), sort: t.sort });
  const canWrite = can(user?.platformRole, "case.write");

  const columns: Column<ControlCaseRow>[] = [
    {
      key: "title",
      header: "Case",
      sortKey: "title",
      cell: (c) => (
        <>
          <Link to={`/cases/${c.id}`} className="font-medium text-primary hover:underline">{c.title}</Link>
          {c.createdBy && <div className="text-xs text-muted-foreground">Opened by {c.createdBy}</div>}
        </>
      ),
    },
    ...(companyId ? [] : [{ key: "company", header: "Company", className: "text-sm", cell: (c: ControlCaseRow) => <Link to={`/companies/${c.companyId}`} className="hover:underline">{c.companyName}</Link> }]),
    { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    { key: "notes", header: "Notes", align: "right", secondary: true, cell: (c) => c.noteCount },
    { key: "updated", header: "Updated", sortKey: "updatedAt", className: "text-sm text-muted-foreground", cell: (c) => lagos(c.updatedAt) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Select value={t.filter("status")} onValueChange={(v) => t.setFilter("status", v)}>
          <SelectTrigger className="w-[160px]" aria-label="Case status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        {canWrite && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> New case
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        rows={data?.data}
        rowKey={(c) => c.id}
        what="cases"
        loading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        pagination={data}
        onPageChange={t.setPage}
        sort={t.sort}
        onSortChange={t.setSort}
      />
      {creating && <NewCaseDialog open onOpenChange={setCreating} defaults={{ ...defaults, companyId: companyId ?? defaults?.companyId }} />}
    </div>
  );
}
