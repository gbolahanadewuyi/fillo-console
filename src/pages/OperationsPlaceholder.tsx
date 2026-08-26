import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";

export function OperationsPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title} — control plane view</CardTitle>
          <CardDescription>Read-heavy cross-tenant table. Writes require explicit justification and audit.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>This section will list {title.toLowerCase()} across all companies (paginated, searchable), with detail links to the tenant record.</p>
          <p>
            Endpoints: <span className="font-mono text-xs">GET /control/{title.toLowerCase()}</span> (planned).
          </p>
          <p>
            For now, use <Link to="/support" className="text-primary hover:underline">Support search</Link> or open a tenant via <Link to="/companies" className="text-primary hover:underline">Companies</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
