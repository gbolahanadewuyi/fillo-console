import { Link, useSearchParams } from "react-router-dom";
import { useControlUsers, type ControlUser } from "@/hooks/useControlApi";
import { apiValue, useTableState } from "@/hooks/useTableState";
import { DataTable, SearchBox, type Column } from "@/components/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { InvitesPanel } from "@/components/InvitesPanel";

const COLUMNS: Column<ControlUser>[] = [
  {
    key: "user",
    header: "User",
    sortKey: "name",
    cell: (u) => (
      <>
        <Link to={`/users/${u.id}`} className="font-medium hover:underline">
          {u.name}
        </Link>
        <div className="text-xs text-muted-foreground">{u.email}</div>
      </>
    ),
  },
  {
    key: "company",
    header: "Company",
    cell: (u) => (
      <Link to={`/companies/${u.companyId}`} className="text-primary hover:underline text-sm">
        {u.companyName ?? u.companyId}
      </Link>
    ),
  },
  { key: "station", header: "Station", secondary: true, className: "text-sm", cell: (u) => u.stationName ?? "—" },
  { key: "role", header: "Role", secondary: true, className: "text-sm", cell: (u) => u.roleName },
  { key: "status", header: "Status", cell: (u) => <StatusBadge status={u.status} /> },
  { key: "created", header: "Created", sortKey: "createdAt", secondary: true, className: "text-sm text-muted-foreground", cell: (u) => new Date(u.createdAt).toLocaleDateString() },
];

export default function UsersPage() {
  const [params, setParams] = useSearchParams();
  const t = useTableState();
  const { data, isLoading, error, refetch } = useControlUsers({ page: t.page, pageSize: 20, search: t.filter("search"), status: apiValue(t.filter("status")), sort: t.sort });
  const tab = params.get("tab") === "invitations" ? "invitations" : "people";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">People and invitations across all companies. Open a person to see why they can or cannot sign in.</p>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => setParams((cur) => { const next = new URLSearchParams(cur); if (v === "people") next.delete("tab"); else next.set("tab", v); return next; }, { replace: true })}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>
        <TabsContent value="invitations">
          <Card>
            <CardContent className="pt-6">
              <InvitesPanel />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="people">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <SearchBox value={t.filter("search")} onChange={(v) => t.setFilter("search", v)} placeholder="Search name or email…" />
                <Select value={t.filter("status") || "all"} onValueChange={(v) => t.setFilter("status", v)}>
                  <SelectTrigger className="w-[160px]" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={COLUMNS}
                rows={data?.data}
                rowKey={(u) => u.id}
                what="users"
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
