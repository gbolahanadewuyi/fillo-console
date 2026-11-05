import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmWithReason } from "@/components/ConfirmWithReason";
import { useAddressCheck, useSetCompanyMode, useSetCompanySlug, type ControlCompany } from "@/hooks/useControlApi";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";

const HOST = ".fillo.cloud";
/** The DNS server the tenant addresses point at (the Coolify host). Kept here so the steps below are copy-ready. */
const SERVER_IP = "161.97.149.230";

/** A company's address and business type. Both are staff-only: the owner's Settings no longer offers the type, and the address is chosen here. */
export function AddressPanel({ company }: { company: ControlCompany }) {
  const { user } = useAuth();
  const allowed = can(user?.platformRole, "company.create");
  const setSlug = useSetCompanySlug();
  const setMode = useSetCompanyMode();
  const check = useAddressCheck(company.id);
  const [slug, setSlugValue] = useState(company.slug ?? "");
  const [confirmSlug, setConfirmSlug] = useState(false);
  const [mode, setModeValue] = useState<"RETAIL" | "DEPOT">(company.mode ?? "RETAIL");
  const [confirmMode, setConfirmMode] = useState(false);
  const address = company.slug ? `https://${company.slug}${HOST}` : null;
  const result = check.data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription>{address ? <a href={address} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{address}<ExternalLink className="h-3 w-3" /></a> : "This company has no address yet."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allowed && (
            <div className="space-y-2">
              <Label htmlFor="company-slug">Change the address</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input id="company-slug" className="max-w-xs" value={slug} onChange={(e) => setSlugValue(e.target.value.toLowerCase())} />
                <span className="text-sm text-muted-foreground">{HOST}</span>
                <Button variant="outline" disabled={!slug.trim() || slug.trim() === company.slug} onClick={() => setConfirmSlug(true)}>Change address</Button>
              </div>
            </div>
          )}

          {company.slug && (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">To make the address open</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>In GoDaddy, add an A record: name <code>{company.slug}</code>, value <code>{SERVER_IP}</code>. No AAAA record.</li>
                <li>In Coolify, open the app (fillo-app) and add <code>{company.slug}{HOST}</code> to its domains, then redeploy.</li>
                <li>Press Check below. A certificate can take a few minutes.</li>
              </ol>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button size="sm" variant="outline" disabled={check.isPending} onClick={() => check.mutate()}>{check.isPending ? "Checking…" : "Check the address"}</Button>
                {result && (
                  <span className={result.live ? "text-green-600" : "text-amber-600"}>
                    {result.live ? "The address is live." : `Not live yet${result.status ? ` (it answered ${result.status})` : result.error ? ` (${result.error})` : ""}.`}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business type</CardTitle>
          <CardDescription>Retail companies sell at a till. Depots load trucks from tanks. Only Fillo staff change this.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Select value={mode} onValueChange={(v) => setModeValue(v as "RETAIL" | "DEPOT")} disabled={!allowed}>
            <SelectTrigger className="w-[240px]" aria-label="Business type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="RETAIL">Retail (till, plant)</SelectItem>
              <SelectItem value="DEPOT">Depot (tanks, loading)</SelectItem>
            </SelectContent>
          </Select>
          {allowed && <Button variant="outline" disabled={mode === (company.mode ?? "RETAIL")} onClick={() => setConfirmMode(true)}>Change type</Button>}
        </CardContent>
      </Card>

      <ConfirmWithReason
        open={confirmSlug}
        onOpenChange={setConfirmSlug}
        title={`Change ${company.name}'s address`}
        description={`The address becomes ${slug.trim()}${HOST}. Links already sent to the company's people and the old DNS record stop working, and the new address needs its own DNS record and Coolify domain.`}
        confirmLabel="Change address"
        onConfirm={(reason) => setSlug.mutateAsync({ id: company.id, slug: slug.trim(), reason })}
      />
      <ConfirmWithReason
        open={confirmMode}
        onOpenChange={setConfirmMode}
        title={`Change ${company.name} to a ${mode === "DEPOT" ? "depot" : "retail"} company`}
        description="This changes the screens the company sees (till and plant, or tanks and loading). Check that it has no open orders or stock in the old setup first."
        confirmLabel="Change type"
        onConfirm={(reason) => setMode.mutateAsync({ id: company.id, mode, reason })}
      />
    </div>
  );
}
