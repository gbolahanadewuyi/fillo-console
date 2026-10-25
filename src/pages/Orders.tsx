import { Link } from "react-router-dom";
import { useControlOrders, type ControlOrderRow } from "@/hooks/useControlApi";
import { apiValue, useTableState } from "@/hooks/useTableState";
import { CompanyScope, useCompanyScope } from "@/components/CompanyScope";
import { naira, lagos, words } from "@/lib/format";
import { DataTable, SearchBox, type Column } from "@/components/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = ["DRAFT", "AWAITING_PAYMENT", "PAID", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"];

const COLUMNS: Column<ControlOrderRow>[] = [
  {
    key: "order",
    header: "Order",
    sortKey: "orderNumber",
    cell: (o) => (
      <>
        <Link to={`/orders/${o.id}`} className="font-medium text-primary hover:underline">#{o.orderNumber}</Link>
        {o.deleted && <span className="ml-2 text-xs text-muted-foreground">deleted</span>}
      </>
    ),
  },
  {
    key: "company",
    header: "Company",
    className: "text-sm",
    cell: (o) => (
      <>
        <Link to={`/companies/${o.companyId}`} className="hover:underline">{o.companyName}</Link>
        <div className="text-xs text-muted-foreground">{o.stationName}</div>
      </>
    ),
  },
  { key: "customer", header: "Customer", secondary: true, className: "text-sm", cell: (o) => o.customerName ?? <span className="text-muted-foreground">Walk-in</span> },
  { key: "status", header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
  { key: "payment", header: "Payment", cell: (o) => <StatusBadge status={o.paymentStatus} /> },
  { key: "total", header: "Total", sortKey: "total", align: "right", cell: (o) => naira(o.total) },
  { key: "created", header: "Created", sortKey: "createdAt", secondary: true, className: "text-sm text-muted-foreground", cell: (o) => lagos(o.createdAt) },
];

export default function Orders() {
  const scope = useCompanyScope();
  const t = useTableState();
  const { data, isLoading, error, refetch } = useControlOrders({
    page: t.page,
    pageSize: 20,
    companyId: scope.companyId,
    search: t.filter("search"),
    status: apiValue(t.filter("status")),
    paymentStatus: apiValue(t.filter("paid")),
    sort: t.sort,
  });

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
            <SearchBox value={t.filter("search")} onChange={(v) => t.setFilter("search", v)} placeholder="Order number or customer…" />
            <Select value={t.filter("status") || "all"} onValueChange={(v) => t.setFilter("status", v)}>
              <SelectTrigger className="w-[190px]" aria-label="Order status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{words(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={t.filter("paid") || "all"} onValueChange={(v) => t.setFilter("paid", v)}>
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
          <DataTable
            columns={COLUMNS}
            rows={data?.data}
            rowKey={(o) => o.id}
            what="orders"
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
