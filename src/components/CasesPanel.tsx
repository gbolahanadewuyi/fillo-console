import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { useControlCases } from "@/hooks/useControlApi";
import { lagos } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { TablePagination } from "@/components/TablePagination";
import { QueryError } from "@/components/QueryError";
import { NewCaseDialog, type CaseDefaults } from "@/components/NewCaseDialog";

/** Cases, newest activity first with open ones on top. With `companyId` it is that company's only. */
export function CasesPanel({ companyId, startOpen = false, defaults }: { companyId?: string; startOpen?: boolean; defaults?: CaseDefaults }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("OPEN");
  const [creating, setCreating] = useState(startOpen);
  const { data, error, refetch } = useControlCases({ page, pageSize: 20, companyId, status: status === "all" ? "" : status });
  const canWrite = can(user?.platformRole, "case.write");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
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
      {error && <QueryError error={error} onRetry={() => void refetch()} what="cases" />}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Case</TableHead>
            {!companyId && <TableHead>Company</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Notes</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.data ?? []).map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link to={`/cases/${c.id}`} className="font-medium text-primary hover:underline">{c.title}</Link>
                {c.createdBy && <div className="text-xs text-muted-foreground">Opened by {c.createdBy}</div>}
              </TableCell>
              {!companyId && (
                <TableCell className="text-sm">
                  <Link to={`/companies/${c.companyId}`} className="hover:underline">{c.companyName}</Link>
                </TableCell>
              )}
              <TableCell><StatusBadge status={c.status} /></TableCell>
              <TableCell className="text-right tabular-nums">{c.noteCount}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{lagos(c.updatedAt)}</TableCell>
            </TableRow>
          ))}
          {!error && (data?.data?.length ?? 0) === 0 && (
            <TableRow>
              <TableCell colSpan={companyId ? 4 : 5} className="text-center py-6 text-muted-foreground">No cases.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {data && <TablePagination page={data.page} pageSize={data.pageSize} total={data.total} totalPages={data.totalPages} onPageChange={setPage} />}
      {creating && <NewCaseDialog open onOpenChange={setCreating} defaults={{ ...defaults, companyId: companyId ?? defaults?.companyId }} />}
    </div>
  );
}
