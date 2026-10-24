import { ActivityLedger } from "@/components/ActivityLedger";

export default function AuditLogs() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          The same record as Activity. To see what Fillo staff changed, filter by <span className="font-mono text-xs">company.</span> or <span className="font-mono text-xs">platform.</span>
        </p>
      </div>
      <ActivityLedger source="audit-logs" title="Audit trail" description="Entries can't be edited from the console. Each staff change shows who made it and the reason they gave." />
    </div>
  );
}
