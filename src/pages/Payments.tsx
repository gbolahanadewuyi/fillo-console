import { useState } from "react";
import { Link } from "react-router-dom";
import { useControlPosTransactions } from "@/hooks/useControlApi";
import { CompanyScope, useCompanyScope } from "@/components/CompanyScope";
import { naira, lagos, words } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { TablePagination } from "@/components/TablePagination";
import { QueryError } from "@/components/QueryError";

/** POS transactions the providers reported, and whether a recorded payment has been matched to each. */
export default function Payments() {
  const scope = useCompanyScope();
  const [page, setPage] = useState(1);
  const [matched, setMatched] = useState("no");
  const [status, setStatus] = useState("all");
  const { data, error, refetch } = useControlPosTransactions({ page, pageSize: 20, companyId: scope.companyId, matched: matched === "all" ? "" : matched, status: status === "all" ? "" : status });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">Card-machine transactions reported by providers. One that is not matched to an order is a payment the business has not recorded yet.</p>
      </div>
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <CompanyScope companyId={scope.companyId} onClear={scope.clear} />
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={matched} onValueChange={(v) => { setMatched(v); setPage(1); }}>
              <SelectTrigger className="w-[190px]" aria-label="Matching"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Not matched to an order</SelectItem>
                <SelectItem value="yes">Matched</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[170px]" aria-label="Transaction status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="SUCCESSFUL">Successful</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REVERSED">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error && <QueryError error={error} onRetry={() => void refetch()} what="payments" />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm"><Link to={`/companies/${t.companyId}`} className="hover:underline">{t.companyName}</Link></TableCell>
                  <TableCell className="text-sm">{words(t.provider)}</TableCell>
                  <TableCell className="font-mono text-xs">{t.externalReference}</TableCell>
                  <TableCell className="text-right tabular-nums">{naira(t.amount)}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell className="text-sm">
                    {t.matchedOrderId ? <Link to={`/orders/${t.matchedOrderId}`} className="text-primary hover:underline">#{t.matchedOrderNumber}</Link> : <span className="text-muted-foreground">Not matched</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lagos(t.paidAt)}</TableCell>
                </TableRow>
              ))}
              {!error && (data?.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No transactions.</TableCell>
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
