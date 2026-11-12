import { useState } from "react";
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
import { useImportRecords, type ImportResult } from "@/hooks/useControlApi";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { can } from "@/lib/permissions";
import { sheetFromCsv, templateCsv, type ImportKind, type Sheet } from "@/lib/csv";

const KINDS: { value: ImportKind; label: string; needs: string }[] = [
  { value: "customers", label: "Customers", needs: "a phone number for each (a name is optional)" },
  { value: "suppliers", label: "Suppliers", needs: "a name for each" },
  { value: "riders", label: "Riders", needs: "a name and a phone number for each" },
];

function download(kind: ImportKind) {
  const url = URL.createObjectURL(new Blob([templateCsv(kind)], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${kind}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Customers, suppliers or riders from the sheet a client sent, in three steps: choose the file, see exactly what would happen (nothing is written
 * yet), then import with a reason. Rows that are wrong or already exist are listed with why, never half created.
 */
export function ImportRecords({ companyId }: { companyId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const run = useImportRecords();
  const [kind, setKind] = useState<ImportKind>("customers");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [fileName, setFileName] = useState("");
  const [check, setCheck] = useState<ImportResult | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>(null);
  const editable = can(user?.platformRole, "company.override");

  function reset(next?: ImportKind) {
    if (next) setKind(next);
    setSheet(null);
    setFileName("");
    setCheck(null);
    setReason("");
    setError(null);
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    reset();
    setFileName(file.name);
    const parsed = sheetFromCsv(await file.text(), kind);
    setSheet(parsed);
    if (parsed.rows.length === 0 || parsed.missing.length > 0) return;
    try {
      setCheck(await run.mutateAsync({ id: companyId, kind, rows: parsed.rows, dryRun: true }));
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The sheet could not be checked."));
    }
  }

  async function runImport() {
    if (!sheet || !check) return;
    setError(null);
    try {
      const done = await run.mutateAsync({ id: companyId, kind, rows: sheet.rows, dryRun: false, reason: reason.trim() });
      toast({ title: `${done.created} ${kind} imported`, description: done.skipped.length ? `${done.skipped.length} rows were left out.` : undefined });
      setCheck(done);
      setSheet(null);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The import failed."));
    }
  }

  const problems = sheet && (sheet.rows.length === 0 ? "The file has no rows." : sheet.missing.length ? `The file needs a ${sheet.missing.join(" and a ")} column.` : null);
  const ready = !!check && check.dryRun && check.created > 0 && !!sheet && reason.trim().length >= MIN_REASON_LENGTH && !run.isPending;
  const finished = !!check && !check.dryRun;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from a sheet</CardTitle>
        <CardDescription>Customers, suppliers or riders from a CSV file. You see what will happen before anything is added.</CardDescription>
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
            <Label htmlFor="import-file">CSV file</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Input id="import-file" type="file" accept=".csv,text/csv" className="max-w-sm" disabled={!editable || run.isPending} onChange={(e) => void choose(e.target.files?.[0])} />
              <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => download(kind)}>
                <Download className="mr-1 h-4 w-4" /> Template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Needs {KINDS.find((k) => k.value === kind)?.needs}. Up to 500 rows at a time.</p>
          </div>
        </div>

        {problems && <p role="alert" className="text-sm text-destructive">{problems}</p>}
        {!!sheet?.ignored.length && !problems && <p className="text-xs text-muted-foreground">Left out of {fileName}: {sheet.ignored.join(", ")}.</p>}

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
