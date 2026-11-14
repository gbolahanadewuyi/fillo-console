import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorReference } from "@/components/ErrorReference";
import { MIN_REASON_LENGTH } from "@/components/ConfirmWithReason";
import { downloadImportTemplate, useImportFile, type ImportKind, type ImportResult } from "@/hooks/useControlApi";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { can } from "@/lib/permissions";

const KINDS: { value: ImportKind; label: string; needs: string }[] = [
  { value: "customers", label: "Customers", needs: "a phone number for each (a name is optional)" },
  { value: "suppliers", label: "Suppliers", needs: "a name for each" },
  { value: "riders", label: "Riders", needs: "a name and a phone number for each" },
];

/**
 * Customers, suppliers or riders from the sheet a client filled in, in three steps: choose the file (the template, as Excel or CSV), see exactly what
 * would happen (nothing is written yet), then import with a reason. The API reads the file, so the format is the same here as in the customer app.
 * Rows that are wrong or already exist are listed with why, never half created.
 */
export function ImportRecords({ companyId }: { companyId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const run = useImportFile();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<ImportKind>("customers");
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<ImportResult | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>(null);
  const editable = can(user?.platformRole, "company.override");

  function reset(next?: ImportKind) {
    if (next) setKind(next);
    setFile(null);
    setCheck(null);
    setReason("");
    setError(null);
    if (input.current) input.current.value = "";
  }

  async function choose(chosen: File | undefined) {
    if (!chosen) return;
    setCheck(null);
    setError(null);
    setFile(chosen);
    try {
      setCheck(await run.mutateAsync({ id: companyId, kind, file: chosen, dryRun: true }));
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The file could not be checked."));
    }
  }

  async function template(format: "xlsx" | "csv") {
    try {
      await downloadImportTemplate(kind, format);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The template could not be downloaded."));
    }
  }

  async function runImport() {
    if (!file || !check) return;
    setError(null);
    try {
      const done = await run.mutateAsync({ id: companyId, kind, file, dryRun: false, reason: reason.trim() });
      toast({ title: `${done.created} ${kind} imported`, description: done.skipped.length ? `${done.skipped.length} rows were left out.` : undefined });
      setCheck(done);
      setFile(null);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The import failed."));
    }
  }

  const ready = !!check && check.dryRun && check.created > 0 && !!file && reason.trim().length >= MIN_REASON_LENGTH && !run.isPending;
  const finished = !!check && !check.dryRun;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from a sheet</CardTitle>
        <CardDescription>Customers, suppliers or riders from the template, as Excel or CSV. You see what will happen before anything is added.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
          <div className="space-y-2">
            <Label htmlFor="import-kind">What is in the sheet</Label>
            <Select value={kind} onValueChange={(v) => reset(v as ImportKind)}>
              <SelectTrigger id="import-kind"><SelectValue /></SelectTrigger>
              <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-file">Excel or CSV file</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Input ref={input} id="import-file" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="max-w-sm" disabled={!editable || run.isPending} onChange={(e) => void choose(e.target.files?.[0])} />
              <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => void template("xlsx")}>
                <Download className="mr-1 h-4 w-4" /> Excel template
              </Button>
              <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => void template("csv")}>
                <Download className="mr-1 h-4 w-4" /> CSV template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Needs {KINDS.find((k) => k.value === kind)?.needs}. Up to 500 rows at a time.</p>
          </div>
        </div>

        {!!check?.ignoredColumns?.length && <p className="text-xs text-muted-foreground">Left out of {file?.name ?? "the file"}: {check.ignoredColumns.join(", ")}.</p>}

        {check && (
          <div className="space-y-3" aria-live="polite">
            <p className="text-sm">
              {finished ? (
                <><strong>{check.created}</strong> {check.kind} imported{check.skipped.length > 0 && <>, <strong>{check.skipped.length}</strong> left out</>}.</>
              ) : (
                <><strong>{check.created}</strong> of {check.total} rows would be added{check.skipped.length > 0 && <>, <strong>{check.skipped.length}</strong> left out</>}. Nothing has been added yet.</>
              )}
            </p>
            {check.skipped.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow><TableHead className="w-16">Row</TableHead><TableHead>Name</TableHead><TableHead>Why it is left out</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {check.skipped.slice(0, 50).map((s) => (
                    <TableRow key={s.row}><TableCell>{s.row}</TableCell><TableCell>{s.name}</TableCell><TableCell className="text-sm">{s.reason}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {check.skipped.length > 50 && <p className="text-xs text-muted-foreground">Showing the first 50 of {check.skipped.length}.</p>}
          </div>
        )}

        {!!error && (
          <div role="alert" className="text-sm text-destructive">
            {(error as Error).message}
            <ErrorReference error={error} />
          </div>
        )}

        {editable && !finished && check && check.created > 0 && (
          <div className="space-y-3 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="import-reason">Reason (kept in the audit trail)</Label>
              <Textarea id="import-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. Customer list from their onboarding document" />
            </div>
            <Button onClick={runImport} disabled={!ready}>{run.isPending ? "Importing…" : `Import ${check.created} ${check.kind}`}</Button>
          </div>
        )}
        {finished && <Button variant="outline" onClick={() => reset()}>Import another sheet</Button>}
      </CardContent>
    </Card>
  );
}
