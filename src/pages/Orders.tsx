import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useControlOrders } from "@/hooks/useControlApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CompanyScope, useCompanyScope } from "@/components/CompanyScope";
import { naira, lagos, words } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { TablePagination } from "@/components/TablePagination";
import { QueryError } from "@/components/QueryError";

const STATUSES = ["DRAFT", "AWAITING_PAYMENT", "PAID", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"];

export default function Orders() {
  const scope = useCompanyScope();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paid, setPaid] = useState("all");
  const { data, error, refetch } = useControlOrders({
    page,
    pageSize: 20,
    companyId: scope.companyId,
    search: useDebouncedValue(search.trim()),
    status: status === "all" ? "" : status,
    paymentStatus: paid === "all" ? "" : paid,
  });
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">Every company's orders, read-only. Open one to see what was paid and what stock it moved.</p>
      </div>
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <CompanyScope companyId={scope.companyId} onClear={scope.clear} />
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Order number or customer…" className="pl-9" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
            </div>
            <Select value={status} onValueChange={reset(setStatus)}>
              <SelectTrigger className="w-[190px]" aria-label="Order status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{words(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={paid} onValueChange={reset(setPaid)}>
              <SelectTrigger className="w-[170px]" aria-label="Payment status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any payment</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Part paid</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error && <QueryError error={error} onRetry={() => void refetch()} what="orders" />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link to={`/orders/${o.id}`} className="font-medium text-primary hover:underline">#{o.orderNumber}</Link>
                    {o.deleted && <span className="ml-2 text-xs text-muted-foreground">deleted</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    <Link to={`/companies/${o.companyId}`} className="hover:underline">{o.companyName}</Link>
                    <div className="text-xs text-muted-foreground">{o.stationName}</div>
                  </TableCell>
                  <TableCell className="text-sm">{o.customerName ?? <span className="text-muted-foreground">Walk-in</span>}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell><StatusBadge status={o.paymentStatus} /></TableCell>
                  <TableCell className="text-right tabular-nums">{naira(o.total)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lagos(o.createdAt)}</TableCell>
                </TableRow>
              ))}
              {!error && (data?.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No orders.</TableCell>
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
