import { useParams } from "react-router-dom";
import { useControlCompany, useControlStations, useControlUsers, useControlActivity, useUnsuspendCompany, type ControlCompany } from "@/hooks/useControlApi";
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
import { ConfirmWithReason } from "@/components/ConfirmWithReason";
import { QueryError } from "@/components/QueryError";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";

const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Its own component so the fields start from the company's saved colours once they have loaded. */
function BrandingForm({ company }: { company: ControlCompany }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const brandingMut = useUpdateCompanyBranding();
  const editable = can(user?.platformRole, "company.branding");
  const [primaryColor, setPrimaryColor] = useState(company.primaryColor ?? "#1B6EF3");
  const [secondaryColor, setSecondaryColor] = useState(company.secondaryColor ?? "#0B1B2A");
  const valid = HEX.test(primaryColor) && HEX.test(secondaryColor);

  return (
    <CardContent className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { id: "primary", label: "Primary colour", value: primaryColor, set: setPrimaryColor },
          { id: "secondary", label: "Secondary colour", value: secondaryColor, set: setSecondaryColor },
        ].map((f) => (
          <div key={f.id} className="space-y-2">
            <Label htmlFor={f.id}>{f.label}</Label>
            <div className="flex gap-2">
              <Input id={f.id} value={f.value} onChange={(e) => f.set(e.target.value)} placeholder="#1B6EF3" disabled={!editable} aria-invalid={!HEX.test(f.value)} />
              <div className="h-9 w-9 rounded border" style={{ background: HEX.test(f.value) ? f.value : "transparent" }} />
            </div>
            {!HEX.test(f.value) && <p className="text-xs text-destructive">Use a hex colour like #1B6EF3.</p>}
          </div>
        ))}
      </div>
      {editable ? (
        <Button
          disabled={brandingMut.isPending || !valid}
          onClick={async () => {
            try {
              await brandingMut.mutateAsync({ id: company.id, payload: { primaryColor, secondaryColor } });
              toast({ title: "Branding updated" });
            } catch (e) {
              toast({ title: "Failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" as never });
            }
          }}
        >
          Save branding
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Your role can view branding but not change it.</p>
      )}
    </CardContent>
  );
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading, error, refetch } = useControlCompany(id!);
  const { data: stations, error: stationsError } = useControlStations({ companyId: id, pageSize: 50 });
  const { data: users, error: usersError } = useControlUsers({ companyId: id, pageSize: 50 });
  const { data: activity, error: activityError } = useControlActivity({ companyId: id, pageSize: 20 });
  const { toast } = useToast();
  const { user } = useAuth();
  const suspendMut = useSuspendCompany();
  const unsuspendMut = useUnsuspendCompany();
  const [confirm, setConfirm] = useState<"suspend" | "unsuspend" | null>(null);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading company…</div>;
  if (error || !company) return <QueryError error={error ?? new Error("Company not found")} onRetry={() => void refetch()} what="this company" />;
  const suspended = company.status === "suspended";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
          <p className="text-sm text-muted-foreground">
            {company.industry ?? "—"} • <StatusBadge status={company.status} className="ml-1" /> • {company.subscriptionStatus} • Created {new Date(company.createdAt).toLocaleDateString()}
          </p>
        </div>
        {suspended
          ? can(user?.platformRole, "company.unsuspend") && (
              <Button size="sm" onClick={() => setConfirm("unsuspend")}>
                Reactivate company
              </Button>
            )
          : can(user?.platformRole, "company.suspend") && (
              <Button variant="destructive" size="sm" onClick={() => setConfirm("suspend")}>
                Suspend company
              </Button>
            )}
        <ConfirmWithReason
          open={confirm === "suspend"}
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`Suspend ${company.name}?`}
          description="Every user of this company is blocked until it is reactivated. Billing status is not changed. This is recorded in the audit trail."
          confirmLabel="Suspend company"
          destructive
          onConfirm={async (reason) => {
            await suspendMut.mutateAsync({ id: id!, reason });
            toast({ title: "Company suspended", description: `${company.name} has been suspended.` });
          }}
        />
        <ConfirmWithReason
          open={confirm === "unsuspend"}
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`Reactivate ${company.name}?`}
          description="Its users can sign in again straight away. This is recorded in the audit trail."
          confirmLabel="Reactivate company"
          onConfirm={async (reason) => {
            await unsuspendMut.mutateAsync({ id: id!, reason });
            toast({ title: "Company reactivated", description: `${company.name} can be used again.` });
          }}
        />
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
              <CardDescription>The tenant record.</CardDescription>
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
              {stationsError && <QueryError error={stationsError} what="stations" />}
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
              {usersError && <QueryError error={usersError} what="users" />}
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
              <CardDescription>Billing status and trial. Plans are not linked to companies yet.</CardDescription>
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
            <BrandingForm key={company.id} company={company} />
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Recent actions for this company.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {activityError && <QueryError error={activityError} what="activity" />}
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
