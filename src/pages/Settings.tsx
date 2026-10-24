import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { isLocalAuth } from "@/lib/auth-mode";

export default function Settings() {
  const apiUrl = import.meta.env.VITE_API_URL as string;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">How this console is connected. These are set when the console is built and can't be changed here.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>Tenant APIs live under /v1, the control plane under /v1/control.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API base URL</Label>
            <Input value={apiUrl} readOnly className="font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label>Sign-in system</Label>
            <Input value={isLocalAuth ? "Fillo accounts" : `Firebase (${import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "not configured"})`} readOnly className="text-sm" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
