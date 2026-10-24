import { useState } from "react";
import { Search } from "lucide-react";
import { useControlActivity, useControlAuditLogs } from "@/hooks/useControlApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { QueryError } from "@/components/QueryError";
import { Link } from "react-router-dom";

interface Props {
  title: string;
  description: string;
  source: "activity" | "audit-logs";
}

/** One filterable view of the activity ledger. Search matches the action, the resource name or its exact id;
 *  "Action starts with" narrows to a family such as `company.` or `platform.`. */
export function ActivityLedger({ title, description, source }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const filters = { page, pageSize, search: useDebouncedValue(search.trim()), action: useDebouncedValue(action.trim()) };
  const activity = useControlActivity(source === "activity" ? filters : { page: 1, pageSize: 1 });
  const audit = useControlAuditLogs(source === "audit-logs" ? filters : { page: 1, pageSize: 1 });
  const { data, error, isLoading, refetch } = source === "activity" ? activity : audit;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search the ledger"
              placeholder="Search action, name or id…"
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Input
            aria-label="Action starts with"
            placeholder="Action starts with, e.g. company."
            className="w-full max-w-[16rem] font-mono text-xs"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <QueryError error={error} onRetry={() => void refetch()} what="the ledger" />
        ) : (
          <>
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
                {(data?.data ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{a.actorName ?? a.actorId ?? "System"}</TableCell>
                    <TableCell className="font-mono text-xs">{a.action}</TableCell>
                    <TableCell className="text-sm">
                      {a.resourceType} {a.resourceLabel ? `• ${a.resourceLabel}` : `• ${a.resourceId.slice(0, 8)}`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.companyId ? (
                        <Link to={`/companies/${a.companyId}`} className="text-primary hover:underline">
                          {a.companyName ?? a.companyId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && (data?.data?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      {search || action ? "Nothing matches those filters." : "Nothing recorded yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              page={data?.page ?? page}
              pageSize={pageSize}
              total={data?.total ?? 0}
              totalPages={data?.totalPages ?? 1}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
