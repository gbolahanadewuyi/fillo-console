import { useControlIntegrations } from "@/hooks/useControlApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";

export default function Integrations() {
  const { data, isLoading } = useControlIntegrations();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">Provider connections per company. Credentials never exposed. Health = last success/failure + webhook recency.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Integration health</CardTitle>
          <CardDescription>WhatsApp (Meta), Moniepoint, OPay, Instagram. Filter by company.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead>Last success</TableHead>
                  <TableHead>Last failure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <Link to={`/companies/${i.companyId}`} className="font-medium text-primary hover:underline">
                        {i.companyName}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{i.provider}</TableCell>
                    <TableCell>
                      <StatusBadge status={i.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.connectedAt ? new Date(i.connectedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.lastSuccessAt ? new Date(i.lastSuccessAt).toLocaleString() : i.lastWebhookAt ? new Date(i.lastWebhookAt).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.lastFailureAt ? new Date(i.lastFailureAt).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
                {(data?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No integrations.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground mt-3">Secrets (accessToken/webhookSecret/apiKey) are masked server-side — never returned to the console.</p>
        </CardContent>
      </Card>
    </div>
  );
}
