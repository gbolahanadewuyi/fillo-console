import { IntegrationsTable } from "@/components/IntegrationsTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Integrations() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">Provider connections per company. Credentials are never shown.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Integration health</CardTitle>
          <CardDescription>Health comes from what each connection actually did in the last 7 days: "Unknown" means nothing happened, not that it works. Failing means the latest call failed; Unreliable means it works now but failed in the last day.</CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationsTable />
        </CardContent>
      </Card>
    </div>
  );
}
