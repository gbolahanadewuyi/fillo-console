import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Notifications() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Platform notification dispatch health and FCM topic management.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Push health</CardTitle>
          <CardDescription>DeviceToken + OutboxEvent publish lag. Topic sends are fire-and-forget; FCM prunes dead tokens.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Planned endpoints:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 font-mono text-xs">
            <li>GET /control/notifications/stats</li>
            <li>GET /control/notifications/delivery</li>
            <li>POST /control/fcm-topic (register/verify)</li>
          </ul>
          <p className="mt-3">Use Activity for current event stream.</p>
        </CardContent>
      </Card>
    </div>
  );
}
