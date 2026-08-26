import { useControlActivity } from "@/hooks/useControlApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";

export default function ActivityPage() {
  const [page] = useState(1);
  const { data } = useControlActivity({ page, pageSize: 50 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Activity</h1>
        <p className="text-sm text-muted-foreground">Actor • Action • Resource • Time. Covers company created, user suspended, plan changed, integration events, etc.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent activity</CardTitle>
          <CardDescription>Polling live feed. Backed by ActivityLog (immutable).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Company</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{a.actorName ?? a.actorId ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{a.action}</TableCell>
                  <TableCell className="text-sm">
                    {a.resourceType} {a.resourceLabel ? `• ${a.resourceLabel}` : `• ${a.resourceId.slice(0, 8)}`}
                  </TableCell>
                  <TableCell className="text-sm">{a.companyName ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(data?.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No activity yet.
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
