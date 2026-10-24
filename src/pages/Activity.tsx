import { ActivityLedger } from "@/components/ActivityLedger";

export default function ActivityPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Activity</h1>
        <p className="text-sm text-muted-foreground">Who did what, across every company, newest first.</p>
      </div>
      <ActivityLedger source="activity" title="All activity" description="Orders, people, settings and platform changes, as recorded by the apps." />
    </div>
  );
}
