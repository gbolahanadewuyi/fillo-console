import { useControlPlans } from "@/hooks/useControlApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Plans() {
  const { data } = useControlPlans();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plans & Billing</h1>
        <p className="text-sm text-muted-foreground">SaaS foundation: plans, price, cycles, limits. Companies show current plan, billing status, renewal, usage. No settlement logic here.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(data ?? []).map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name} <Badge variant="outline" className="font-mono text-xs">{plan.code}</Badge>
              </CardTitle>
              <CardDescription>
                ₦{Number(plan.price).toLocaleString()} / {plan.billingCycle}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stations</span> <span className="font-medium">{plan.stationLimit ?? "∞"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Users</span> <span className="font-medium">{plan.userLimit ?? "∞"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Features</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {plan.featureCodes.map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Plan assignment</CardTitle>
          <CardDescription>Assign via PUT /control/companies/:id/plan (coming soon). Server validates limits vs usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Limits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs">{p.code}</TableCell>
                  <TableCell>₦{Number(p.price).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{p.billingCycle}</TableCell>
                  <TableCell>
                    {p.stationLimit ?? "∞"} stations • {p.userLimit ?? "∞"} users
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
