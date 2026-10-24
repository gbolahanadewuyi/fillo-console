import { useState } from "react";
import { useControlUsers } from "@/hooks/useControlApi";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { TablePagination } from "@/components/TablePagination";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvitesPanel } from "@/components/InvitesPanel";
import { QueryError } from "@/components/QueryError";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data, error, refetch } = useControlUsers({ page, pageSize: 20, search: useDebouncedValue(search.trim()), status: status === "all" ? "" : status });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">People and invitations across all companies. Open a person to see why they can or cannot sign in.</p>
      </div>
      <Tabs defaultValue="people" className="space-y-4">
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
          <CardTitle className="text-sm">All users</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name or email…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
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
          {error && <QueryError error={error} onRetry={() => void refetch()} what="users" />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link to={`/users/${u.id}`} className="font-medium hover:underline">{u.name}</Link>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <Link to={`/companies/${u.companyId}`} className="text-primary hover:underline text-sm">
                      {u.companyName ?? u.companyId}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{u.stationName ?? "—"}</TableCell>
                  <TableCell className="text-sm">{u.roleName}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {!error && (data?.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No users.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {data && <TablePagination page={data.page} pageSize={data.pageSize} total={data.total} totalPages={data.totalPages} onPageChange={setPage} />}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
