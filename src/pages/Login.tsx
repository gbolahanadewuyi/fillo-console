import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/services/api";
import { mockPlatformUsers, MOCK_PLATFORM_PASSWORD, getPlatformRoleMeta } from "@/lib/mock/users";

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast({ title: "Welcome", description: "Signed in to Fillo Console." });
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Sign-in failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(MOCK_PLATFORM_PASSWORD);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Fillo Console</h1>
            <p className="text-sm text-muted-foreground">Control plane — sign in with your Fillo account</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Use your @fillo.cloud account. Platform access is audited.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@fillo.cloud"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Contact a platform owner if you need access. All sign-ins are logged.
              </p>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Seeded demo accounts (Auth emulator)</CardTitle>
            <CardDescription className="text-xs">Password: {MOCK_PLATFORM_PASSWORD} — mirrors EOP demo pattern</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {mockPlatformUsers.map((u) => {
              const meta = getPlatformRoleMeta(u.platformRole);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => fillDemo(u.email)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{u.email} — {u.description}</span>
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{meta.label}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Fillo Console is an internal operator tool. Tenant data is isolated per company. All sign-ins are audited.
        </p>
      </div>
    </div>
  );
}
