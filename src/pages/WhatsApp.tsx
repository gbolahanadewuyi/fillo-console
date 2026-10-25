import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { useControlWhatsapp, type ControlWhatsappNumber } from "@/hooks/useControlApi";
import { apiValue, useTableState } from "@/hooks/useTableState";
import { lagos } from "@/lib/format";
import { DataTable, type Column } from "@/components/DataTable";
import { WhatsappDialog } from "@/components/WhatsappDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null);
const WAITING = ["REQUESTED", "NUMBER_ASSIGNED", "PENDING_APPROVAL"];

/** Companies ask for a WhatsApp number; this is where Fillo sets each one up. The promise to them is 1 to 2 working days. */
export default function WhatsApp() {
  const { user } = useAuth();
  const t = useTableState({ filters: { status: "waiting" } });
  const [editing, setEditing] = useState<ControlWhatsappNumber | null>(null);
  const manage = can(user?.platformRole, "whatsapp.manage");
  // "waiting" is every request not yet live or paused: the work to do.
  const status = t.filter("status");
  const { data, isLoading, error, refetch } = useControlWhatsapp({ page: t.page, pageSize: 20, status: status === "waiting" ? "" : apiValue(status) });
  const rows = status === "waiting" ? data?.data.filter((r) => WAITING.includes(r.status)) : data?.data;

  const columns: Column<ControlWhatsappNumber>[] = [
    { key: "company", header: "Company", cell: (r) => <Link to={`/companies/${r.companyId}`} className="font-medium hover:underline">{r.companyName}</Link> },
    { key: "name", header: "Name customers see", secondary: true, className: "text-sm", cell: (r) => r.requestedDisplayName ?? "—" },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status.toLowerCase()} /> },
    { key: "number", header: "Number", secondary: true, className: "text-sm", cell: (r) => r.displayPhoneNumber ?? "—" },
    {
      key: "asked",
      header: "Asked",
      className: "text-sm text-muted-foreground",
      cell: (r) => {
        const d = daysSince(r.requestedAt);
        const late = d !== null && d >= 2 && WAITING.includes(r.status);
        return (
          <>
            {lagos(r.requestedAt)}
            {d !== null && WAITING.includes(r.status) && <div className={late ? "text-xs font-medium text-red-600" : "text-xs"}>{d === 0 ? "today" : `${d} day${d === 1 ? "" : "s"} ago`}</div>}
          </>
        );
      },
    },
    { key: "actions", header: "", className: "w-[1%]", cell: (r) => (manage ? <Button size="sm" variant="outline" onClick={() => setEditing(r)}>{r.status === "REQUESTED" ? "Set up" : "Update"}</Button> : null) },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp numbers</h1>
        <p className="text-sm text-muted-foreground">Companies ask for a number; set each up here. We tell them 1 to 2 working days.</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <Select value={status} onValueChange={(v) => t.setFilter("status", v)}>
            <SelectTrigger className="w-[220px]" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="waiting">Waiting for us</SelectItem>
              <SelectItem value="LIVE">Live</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="all">Everything</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            what="WhatsApp numbers"
            empty={status === "waiting" ? "No one is waiting for a number." : "No numbers."}
            loading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            pagination={data}
            onPageChange={t.setPage}
          />
        </CardContent>
      </Card>
      {editing && <WhatsappDialog number={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
