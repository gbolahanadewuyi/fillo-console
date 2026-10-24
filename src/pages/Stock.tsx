import { useState } from "react";
import { Link } from "react-router-dom";
import { useControlMovements } from "@/hooks/useControlApi";
import { CompanyScope, useCompanyScope } from "@/components/CompanyScope";
import { lagos, words } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { QueryError } from "@/components/QueryError";

/** The stock ledger: every change to stock, newest first. Stock is the sum of these, so a wrong level starts here. */
export default function Stock() {
  const scope = useCompanyScope();
  const [page, setPage] = useState(1);
  const [type, setType] = useState("all");
  const { data, error, refetch } = useControlMovements({ page, pageSize: 20, companyId: scope.companyId, type: type === "all" ? "" : type });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
        <p className="text-sm text-muted-foreground">Every change to stock, newest first. A level is the sum of its movements, so a wrong level starts here.</p>
      </div>
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <CompanyScope companyId={scope.companyId} onClear={scope.clear} />
          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
            <SelectTrigger className="w-[190px]" aria-label="Movement type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All movements</SelectItem>
              <SelectItem value="SALE">Sales</SelectItem>
              <SelectItem value="PURCHASE">Purchases</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
              <SelectItem value="OPENING_BALANCE">Opening balances</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {error && <QueryError error={error} onRetry={() => void refetch()} what="stock movements" />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">
                    <Link to={`/companies/${m.companyId}`} className="hover:underline">{m.companyName}</Link>
                    <div className="text-xs text-muted-foreground">{m.stationName}</div>
                  </TableCell>
                  <TableCell className="text-sm">{m.productName}</TableCell>
                  <TableCell className="text-sm">{words(m.type)}{m.note ? <div className="text-xs text-muted-foreground">{m.note}</div> : null}</TableCell>
                  <TableCell className={`text-right tabular-nums ${Number(m.quantity) < 0 ? "text-red-700" : ""}`}>{Number(m.quantity)} {m.unit.toLowerCase()}</TableCell>
                  <TableCell className="text-sm">{m.orderId ? <Link to={`/orders/${m.orderId}`} className="text-primary hover:underline">#{m.orderNumber}</Link> : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lagos(m.createdAt)}</TableCell>
                </TableRow>
              ))}
              {!error && (data?.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No movements.</TableCell>
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
