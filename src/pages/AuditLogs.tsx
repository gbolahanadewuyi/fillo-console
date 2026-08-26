import { useState } from "react";
import { useControlAuditLogs } from "@/hooks/useControlApi";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { Search } from "lucide-react";

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const { data } = useControlAuditLogs({ page, pageSize: 20, search: debounced });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Immutable trail: who did what, when, for which company, from where. Sensitive ops: user suspension, role change, plan change, company suspend, integration change.</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Audit trail</CardTitle>
          <CardDescription>No admin can edit these records. Served from ActivityLog + OutboxEvent.</CardDescription>
          <div className="relative mt-3 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filter by action or resource…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} onBlur={() => setDebounced(search)} onKeyDown={(e) => e.key === "Enter" && setDebounced(search)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Company</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{r.actorName ?? r.actorId ?? "system"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.action}</TableCell>
                  <TableCell className="text-sm">
                    {r.resourceType} • {r.resourceLabel ?? r.resourceId.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-sm">{r.companyName ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(data?.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No audit entries.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {data && <TablePagination page={data.page} pageSize={data.pageSize} total={data.total} totalPages={data.totalPages} onPageChange={setPage} />}
        </CardContent>
      </Card>
    </div>
  );
}
