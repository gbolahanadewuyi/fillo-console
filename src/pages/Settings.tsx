import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Settings() {
  const { toast } = useToast();
  const [apiUrl] = useState(import.meta.env.VITE_API_URL);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">Platform-wide configuration. Scoped overrides live in Feature Flags and per-company branding.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Platform settings</CardTitle>
          <CardDescription>Future: payment bank details defaults, currency, tax rate, expense categories, auth proxy config.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API base URL</Label>
            <Input value={apiUrl} readOnly className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Set via VITE_API_URL. Tenant APIs under /v1, control plane under /v1/control.</p>
          </div>
          <div className="space-y-2">
            <Label>Firebase project</Label>
            <Input value={import.meta.env.VITE_FIREBASE_PROJECT_ID ?? ""} readOnly className="font-mono text-xs" />
          </div>
          <Button
            variant="outline"
            onClick={() => toast({ title: "Coming soon", description: "Settings mutations via PATCH /control/settings/:key" })}
          >
            Edit settings
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Security note</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Control plane requires @fillo.cloud authentication + platform role.</p>
          <p>• Secrets (WhatsApp tokens, POS webhook secrets) are masked server-side.</p>
          <p>• Every mutation is audited with actor, timestamp, and target company.</p>
          <p>• Rate limited and confirmation-gated for destructive ops.</p>
        </CardContent>
      </Card>
    </div>
  );
}
