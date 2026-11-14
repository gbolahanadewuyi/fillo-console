import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useControlCompany, useControlStations, useControlUsers, useControlActivity, useUnsuspendCompany, type ControlCompany, type ControlStation, type ControlUser } from "@/hooks/useControlApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FieldError } from "@/components/FieldError";
import { useUpdateCompanyBranding, useSuspendCompany, useSetCompanyTest } from "@/hooks/useControlApi";
import { ConfirmWithReason } from "@/components/ConfirmWithReason";
import { IntegrationsTable } from "@/components/IntegrationsTable";
import { BillingPanel } from "@/components/BillingPanel";
import { CasesPanel } from "@/components/CasesPanel";
import { InvitesPanel } from "@/components/InvitesPanel";
import { LOGO_TYPES, logoProblem, readAsDataUrl } from "@/lib/logo";
import { DeleteCompanyDialog } from "@/components/DeleteCompanyDialog";
import { AddPersonDialog } from "@/components/AddPersonDialog";
import { EditStationDialog } from "@/components/EditStationDialog";
import { EditOwnerDialog } from "@/components/EditOwnerDialog";
import { isTestEnvironment } from "@/lib/environment";
import { NewRoleDialog } from "@/components/NewRoleDialog";
import { AddressPanel } from "@/components/AddressPanel";
import { OrderEditingOverride } from "@/components/OrderEditingOverride";
import { CompanySetupSettings } from "@/components/CompanySetupSettings";
import { ImportRecords } from "@/components/ImportRecords";
import { QueryError } from "@/components/QueryError";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";

/** The tab is kept in the address, so a link can open a company straight on its cases or invitations. */
const TABS = ["overview", "stations", "users", "import", "integrations", "subscription", "cases", "branding", "activity"];

const HEX = /^#[0-9A-Fa-f]{6}$/;

const brandingSchema = z.object({
  primaryColor: z.string().regex(HEX, "Use a hex colour like #1B6EF3."),
  secondaryColor: z.string().regex(HEX, "Use a hex colour like #1B6EF3."),
});
type BrandingValues = z.infer<typeof brandingSchema>;

/** Its own component so the fields start from the company's saved colours once they have loaded. */
function BrandingForm({ company }: { company: ControlCompany }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const brandingMut = useUpdateCompanyBranding();
  const editable = can(user?.platformRole, "company.branding");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<BrandingValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: { primaryColor: company.primaryColor ?? "#1B6EF3", secondaryColor: company.secondaryColor ?? "#0B1B2A" },
  });

  // undefined = leave the logo as it is, null = remove it, a data URI = the new image (the API stores it).
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [logoError, setLogoError] = useState<string | null>(null);
  const shownLogo = logo === undefined ? company.logoUrl : logo;

  async function chooseLogo(file: File | undefined) {
    setLogoError(null);
    if (!file) return;
    const problem = logoProblem(file);
    if (problem) return setLogoError(problem);
    try {
      setLogo(await readAsDataUrl(file));
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Could not read that file.");
    }
  }

  async function save(values: BrandingValues) {
    try {
      await brandingMut.mutateAsync({ id: company.id, payload: { ...values, ...(logo !== undefined ? { logoUrl: logo } : {}) } });
      setLogo(undefined);
      toast({ title: "Branding updated" });
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" as never });
    }
  }

  return (
    <CardContent>
      <form onSubmit={handleSubmit(save)} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-logo">Logo</Label>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-32 items-center justify-center rounded border bg-muted/30 p-2">
              {shownLogo ? <img src={shownLogo} alt={`${company.name} logo`} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">No logo</span>}
            </div>
            {editable && (
              <div className="flex flex-wrap items-center gap-2">
                <Input id="company-logo" type="file" accept={LOGO_TYPES.join(",")} className="max-w-xs" aria-describedby="logo-error" onChange={(e) => void chooseLogo(e.target.files?.[0])} />
                {shownLogo && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setLogo(null)}>
                    Remove logo
                  </Button>
                )}
              </div>
            )}
          </div>
          <FieldError id="logo-error" message={logoError ?? undefined} />
          {logo !== undefined && <p className="text-xs text-muted-foreground">{logo === null ? "The logo will be removed when you save." : "The new logo is used when you save."}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {([["primaryColor", "primary", "Primary colour"], ["secondaryColor", "secondary", "Secondary colour"]] as const).map(([name, id, label]) => {
            const value = watch(name);
            return (
              <div key={id} className="space-y-2">
                <Label htmlFor={id}>{label}</Label>
                <div className="flex gap-2">
                  <Input id={id} placeholder="#1B6EF3" disabled={!editable} aria-invalid={!!errors[name]} aria-describedby={`${id}-error`} {...register(name)} />
                  <div className="h-9 w-9 rounded border" style={{ background: HEX.test(value) ? value : "transparent" }} />
                </div>
                <FieldError id={`${id}-error`} message={errors[name]?.message} />
              </div>
            );
          })}
        </div>
        {editable ? (
          <Button type="submit" disabled={isSubmitting}>
            Save branding
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Your role can view branding but not change it.</p>
        )}
      </form>
    </CardContent>
  );
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab") ?? "") ? params.get("tab")! : "overview";
  const { data: company, isLoading, error, refetch } = useControlCompany(id!);
  const { data: stations, error: stationsError } = useControlStations({ companyId: id, pageSize: 50 });
  const { data: users, error: usersError } = useControlUsers({ companyId: id, pageSize: 50 });
  const { data: activity, error: activityError } = useControlActivity({ companyId: id, pageSize: 20 });
  const { toast } = useToast();
  const { user } = useAuth();
  const suspendMut = useSuspendCompany();
  const unsuspendMut = useUnsuspendCompany();
  const testMut = useSetCompanyTest();
  const [confirm, setConfirm] = useState<"suspend" | "test" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [editingStation, setEditingStation] = useState<ControlStation | null>(null);
  const [editingOwner, setEditingOwner] = useState<ControlUser | null>(null);
  const navigate = useNavigate();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading company…</div>;
  if (error || !company) return <QueryError error={error ?? new Error("Company not found")} onRetry={() => void refetch()} what="this company" />;
  const suspended = company.status === "suspended";

  /** Giving access back is the safe direction, so it just happens and is recorded. Suspending says why. */
  async function reactivate() {
    try {
      await unsuspendMut.mutateAsync({ id: id! });
      toast({ title: "Company reactivated", description: `${company!.name} can be used again.` });
    } catch (e) {
      toast({ title: "Could not reactivate", description: e instanceof Error ? e.message : "Error", variant: "destructive" as never });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {company.name}
            {company.isTest && <span className="ml-2 rounded border px-1.5 py-0.5 align-middle text-xs font-medium text-muted-foreground">Test</span>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {company.industry ?? "—"} • <StatusBadge status={company.status} className="ml-1" /> • {company.subscriptionStatus} • Created {new Date(company.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {(
            [
              ["orders", "Orders"],
              ["payments", "Payments"],
              ["stock", "Stock"],
            ] as const
          ).map(([path, label]) => (
            <Link key={path} to={`/${path}?companyId=${id}`} className="text-primary hover:underline">
              {label}
            </Link>
          ))}
        </div>
        {isTestEnvironment && can(user?.platformRole, "company.test") && (
          <Button variant="outline" size="sm" onClick={() => setConfirm("test")}>
            {company.isTest ? "Mark as a real company" : "Mark as a test company"}
          </Button>
        )}
        {suspended
          ? can(user?.platformRole, "company.unsuspend") && (
              <Button size="sm" onClick={() => void reactivate()} disabled={unsuspendMut.isPending}>
                Reactivate company
              </Button>
            )
          : can(user?.platformRole, "company.suspend") && (
              <Button variant="destructive" size="sm" onClick={() => setConfirm("suspend")}>
                Suspend company
              </Button>
            )}
        {can(user?.platformRole, "company.delete") && (
          <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleting(true)}>
            Delete company
          </Button>
        )}
        <DeleteCompanyDialog
          open={deleting}
          onOpenChange={setDeleting}
          company={{ id: id!, name: company.name }}
          onDeleted={() => {
            toast({ title: "Company deleted", description: `${company.name} and its data were deleted.` });
            navigate("/companies");
          }}
        />
        <ConfirmWithReason
          open={confirm === "test"}
          onOpenChange={(o) => !o && setConfirm(null)}
          title={company.isTest ? `Treat ${company.name} as a real company?` : `Treat ${company.name} as a test company?`}
          description={company.isTest ? "Its orders and problems count on the dashboard again." : "It is left out of the dashboard's numbers and attention list unless you include test companies. Nothing about the company changes."}
          confirmLabel={company.isTest ? "Mark as real" : "Mark as test"}
          onConfirm={async (reason) => {
            await testMut.mutateAsync({ id: id!, isTest: !company.isTest, reason });
            toast({ title: company.isTest ? "Marked as a real company" : "Marked as a test company" });
          }}
        />
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
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setParams((cur) => { const next = new URLSearchParams(cur); if (v === "overview") next.delete("tab"); else next.set("tab", v); return next; }, { replace: true })}
        className="space-y-4"
      >
        <TabsList className="flex w-full overflow-x-auto justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stations">Stations</TabsTrigger>
          <TabsTrigger value="users">People</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="subscription">Billing</TabsTrigger>
          <TabsTrigger value="cases">Cases</TabsTrigger>
          <TabsTrigger value="branding">Settings</TabsTrigger>
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
              {editingStation && <EditStationDialog key={editingStation.id} station={editingStation} open onOpenChange={(o) => { if (!o) setEditingStation(null); }} />}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Users</TableHead>
                    {can(user?.platformRole, "company.override") && <TableHead className="w-[1%]"><span className="sr-only">Edit</span></TableHead>}
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
                      {can(user?.platformRole, "company.override") && (
                        <TableCell><Button size="sm" variant="outline" onClick={() => setEditingStation(s)} aria-label={`Edit ${s.name}`}>Edit</Button></TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(stations?.data?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
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
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle>Users</CardTitle>
              {can(user?.platformRole, "company.override") && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAddingRole(true)}>New role</Button>
                  <Button size="sm" onClick={() => setAddingPerson(true)}>Add person</Button>
                </div>
              )}
              <AddPersonDialog companyId={id!} open={addingPerson} onOpenChange={setAddingPerson} />
              {editingOwner && <EditOwnerDialog key={editingOwner.id} owner={editingOwner} open onOpenChange={(o) => { if (!o) setEditingOwner(null); }} />}
              <NewRoleDialog companyId={id!} open={addingRole} onOpenChange={setAddingRole} />
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
                    {can(user?.platformRole, "company.override") && <TableHead className="w-[1%]"><span className="sr-only">Edit</span></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users?.data ?? []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium"><Link to={`/users/${u.id}`} className="hover:underline">{u.name}</Link></TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell>{u.roleName}</TableCell>
                      <TableCell>
                        <StatusBadge status={u.status} />
                      </TableCell>
                      {can(user?.platformRole, "company.override") && (
                        <TableCell>{u.isOwner && <Button size="sm" variant="outline" onClick={() => setEditingOwner(u)} aria-label={`Edit owner ${u.name}`}>Edit owner</Button>}</TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(users?.data?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        No users.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <InvitesPanel companyId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <ImportRecords companyId={id!} />
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardContent className="pt-6">
              <IntegrationsTable companyId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases">
          <Card>
            <CardContent className="pt-6">
              <CasesPanel companyId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <BillingPanel companyId={id!} companyName={company.name} />
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <AddressPanel key={`${company.id}-${company.slug}-${company.mode}`} company={company} />
          <CompanySetupSettings companyId={company.id} />
          <OrderEditingOverride companyId={company.id} />
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
