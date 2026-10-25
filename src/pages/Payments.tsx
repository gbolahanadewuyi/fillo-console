import { Link } from "react-router-dom";
import { useControlPosTransactions, type ControlPosTransaction } from "@/hooks/useControlApi";
import { apiValue, useTableState } from "@/hooks/useTableState";
import { CompanyScope, useCompanyScope } from "@/components/CompanyScope";
import { naira, lagos, words } from "@/lib/format";
import { DataTable, type Column } from "@/components/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";

const COLUMNS: Column<ControlPosTransaction>[] = [
  { key: "company", header: "Company", className: "text-sm", cell: (t) => <Link to={`/companies/${t.companyId}`} className="hover:underline">{t.companyName}</Link> },
  { key: "provider", header: "Provider", secondary: true, className: "text-sm", cell: (t) => words(t.provider) },
  { key: "ref", header: "Reference", className: "font-mono text-xs", cell: (t) => t.externalReference },
  { key: "amount", header: "Amount", align: "right", cell: (t) => naira(t.amount) },
  { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
  {
    key: "order",
    header: "Order",
    className: "text-sm",
    cell: (t) => (t.matchedOrderId ? <Link to={`/orders/${t.matchedOrderId}`} className="text-primary hover:underline">#{t.matchedOrderNumber}</Link> : <span className="text-muted-foreground">Not matched</span>),
  },
  { key: "paid", header: "Paid", secondary: true, className: "text-sm text-muted-foreground", cell: (t) => lagos(t.paidAt) },
];

/** POS transactions the providers reported, and whether a recorded payment has been matched to each. */
export default function Payments() {
  const scope = useCompanyScope();
  const t = useTableState({ filters: { matched: "no" } });
  const { data, isLoading, error, refetch } = useControlPosTransactions({
    page: t.page,
    pageSize: 20,
    companyId: scope.companyId,
    matched: apiValue(t.filter("matched")),
    status: apiValue(t.filter("status")),
  });

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
            <Select value={t.filter("matched")} onValueChange={(v) => t.setFilter("matched", v)}>
              <SelectTrigger className="w-[190px]" aria-label="Matching"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Not matched to an order</SelectItem>
                <SelectItem value="yes">Matched</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Select value={t.filter("status") || "all"} onValueChange={(v) => t.setFilter("status", v)}>
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
          <DataTable
            columns={COLUMNS}
            rows={data?.data}
            rowKey={(x) => x.id}
            what="payments"
            empty="No transactions."
            loading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            pagination={data}
            onPageChange={t.setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
