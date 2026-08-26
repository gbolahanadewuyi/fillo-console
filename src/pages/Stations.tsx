import { useState } from "react";
import { useControlStations } from "@/hooks/useControlApi";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";

export default function Stations() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const { data } = useControlStations({ search: debounced, pageSize: 50 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stations</h1>
        <p className="text-sm text-muted-foreground">Stations belong to companies. Actions: create, suspend, view activity.</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">All stations</CardTitle>
          <div className="relative mt-3 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stations…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => setDebounced(search)}
              onKeyDown={(e) => e.key === "Enter" && setDebounced(search)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <Link to={`/companies/${s.companyId}`} className="text-primary hover:underline">
                      {s.companyName ?? s.companyId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.address ?? "—"}</TableCell>
                  <TableCell>{s.userCount ?? "—"}</TableCell>
                  <TableCell>{s.orderCount ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(data?.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No stations.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
