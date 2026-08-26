import { useParams } from "react-router-dom";
import { useControlCompany, useControlStations, useControlUsers, useControlActivity } from "@/hooks/useControlApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useUpdateCompanyBranding, useSuspendCompany } from "@/hooks/useControlApi";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading } = useControlCompany(id!);
  const { data: stations } = useControlStations({ companyId: id, pageSize: 50 });
  const { data: users } = useControlUsers({ companyId: id, pageSize: 50 });
  const { data: activity } = useControlActivity({ companyId: id, pageSize: 20 });
  const { toast } = useToast();
  const brandingMut = useUpdateCompanyBranding();
  const suspendMut = useSuspendCompany();

  const [primaryColor, setPrimaryColor] = useState(company?.primaryColor ?? "#1B6EF3");
  const [secondaryColor, setSecondaryColor] = useState(company?.secondaryColor ?? "#0B1B2A");
  const [suspendReason, setSuspendReason] = useState("");

  if (isLoading || !company) return <div className="p-6 text-sm text-muted-foreground">Loading company…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
          <p className="text-sm text-muted-foreground">
            {company.industry ?? "—"} • <StatusBadge status={company.status} className="ml-1" /> • {company.subscriptionStatus} • Created {new Date(company.createdAt).toLocaleDateString()}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={company.status === "suspended"}>
              Suspend company
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Suspend {company.name}?</AlertDialogTitle>
              <AlertDialogDescription>This will block all users for this company. Requires confirmation and is audited.</AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea placeholder="Reason (required for audit)" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await suspendMut.mutateAsync({ id: id!, reason: suspendReason });
                    toast({ title: "Company suspended", description: `${company.name} has been suspended.` });
                  } catch (e) {
                    toast({ title: "Failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" as never });
                  }
                }}
              >
                Confirm suspend
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stations">Stations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Stations</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{company.stationCount}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Users</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{company.userCount}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Plan</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{company.planName ?? "—"}</CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Company overview</CardTitle>
              <CardDescription>High-level tenant record. Future: usage, last activity, support notes.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Company ID</span>
                <div className="font-mono text-xs break-all">{company.id}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Industry</span>
                <div>{company.industry ?? "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Trial ends</span>
                <div>{company.trialEndsAt ? new Date(company.trialEndsAt).toLocaleString() : "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Billing provider</span>
                <div>{company.billingProvider ?? "—"}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stations">
          <Card>
            <CardHeader>
              <CardTitle>Stations</CardTitle>
              <CardDescription>Stations belong to {company.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stations?.data ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell>{s.address ?? "—"}</TableCell>
                      <TableCell>{s.userCount ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(stations?.data?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        No stations.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Staff across {company.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users?.data ?? []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell>{u.roleName}</TableCell>
                      <TableCell>
                        <StatusBadge status={u.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(users?.data?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        No users.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Plan, billing status, renewal, usage vs limits.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Subscription status</span>
                <div>
                  <StatusBadge status={company.subscriptionStatus.toLowerCase()} />
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Plan</span>
                <div className="font-medium">{company.planName ?? "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Trial ends</span>
                <div>{company.trialEndsAt ? new Date(company.trialEndsAt).toLocaleString() : "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Billing</span>
                <div>{company.billingProvider ?? "Not configured"}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Tenant branding</CardTitle>
              <CardDescription>Login, receipts, documents. Fillo remains the platform brand.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary">Primary colour</Label>
                  <div className="flex gap-2">
                    <Input id="primary" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#1B6EF3" />
                    <div className="h-9 w-9 rounded border" style={{ background: primaryColor }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary">Secondary colour</Label>
                  <div className="flex gap-2">
                    <Input id="secondary" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} placeholder="#0B1B2A" />
                    <div className="h-9 w-9 rounded border" style={{ background: secondaryColor }} />
                  </div>
                </div>
              </div>
              <Button
                disabled={brandingMut.isPending}
                onClick={async () => {
                  try {
                    await brandingMut.mutateAsync({ id: id!, payload: { primaryColor, secondaryColor } });
                    toast({ title: "Branding updated" });
                  } catch (e) {
                    toast({ title: "Failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" as never });
                  }
                }}
              >
                Save branding
              </Button>
              <p className="text-xs text-muted-foreground">Stored on Company.primaryColor/secondaryColor; hover shades derived at render (see EOP theme.ts).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Recent actions for this company.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(activity?.data ?? []).map((a) => (
                <div key={a.id} className="text-sm py-2 border-b last:border-0">
                  <span className="font-medium">{a.action}</span> <span className="text-muted-foreground">• {a.resourceLabel ?? a.resourceId}</span>
                  <div className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {(activity?.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No activity.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
