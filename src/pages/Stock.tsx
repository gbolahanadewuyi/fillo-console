import { Link } from "react-router-dom";
import { useControlMovements, type ControlMovement } from "@/hooks/useControlApi";
import { apiValue, useTableState } from "@/hooks/useTableState";
import { CompanyScope, useCompanyScope } from "@/components/CompanyScope";
import { lagos, words } from "@/lib/format";
import { DataTable, type Column } from "@/components/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const COLUMNS: Column<ControlMovement>[] = [
  {
    key: "company",
    header: "Company",
    className: "text-sm",
    cell: (m) => (
      <>
        <Link to={`/companies/${m.companyId}`} className="hover:underline">{m.companyName}</Link>
        <div className="text-xs text-muted-foreground">{m.stationName}</div>
      </>
    ),
  },
  { key: "product", header: "Product", className: "text-sm", cell: (m) => m.productName },
  { key: "type", header: "Type", className: "text-sm", cell: (m) => <>{words(m.type)}{m.note ? <div className="text-xs text-muted-foreground">{m.note}</div> : null}</> },
  { key: "qty", header: "Quantity", align: "right", cell: (m) => <span className={Number(m.quantity) < 0 ? "text-red-700" : ""}>{Number(m.quantity)} {m.unit.toLowerCase()}</span> },
  { key: "order", header: "Order", className: "text-sm", cell: (m) => (m.orderId ? <Link to={`/orders/${m.orderId}`} className="text-primary hover:underline">#{m.orderNumber}</Link> : "—") },
  { key: "when", header: "When", secondary: true, className: "text-sm text-muted-foreground", cell: (m) => lagos(m.createdAt) },
];

/** The stock ledger: every change to stock, newest first. Stock is the sum of these, so a wrong level starts here. */
export default function Stock() {
  const scope = useCompanyScope();
  const t = useTableState();
  const { data, isLoading, error, refetch } = useControlMovements({ page: t.page, pageSize: 20, companyId: scope.companyId, type: apiValue(t.filter("type")) });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
        <p className="text-sm text-muted-foreground">Every change to stock, newest first. A level is the sum of its movements, so a wrong level starts here.</p>
      </div>
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <CompanyScope companyId={scope.companyId} onClear={scope.clear} />
          <Select value={t.filter("type") || "all"} onValueChange={(v) => t.setFilter("type", v)}>
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
          <DataTable
            columns={COLUMNS}
            rows={data?.data}
            rowKey={(m) => m.id}
            what="stock movements"
            empty="No movements."
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
