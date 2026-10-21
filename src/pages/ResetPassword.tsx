import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { OwnAuthError, resetPassword } from "@/lib/own-auth";

const MIN_LENGTH = 10;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (password !== confirm) return setError("The two passwords do not match.");
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof OwnAuthError ? err.message : "Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Fillo Console</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose a new password</CardTitle>
            <CardDescription>At least {MIN_LENGTH} characters. You will be signed out of all other devices.</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-4">
                <div className="rounded-md bg-primary/10 text-sm px-3 py-2">Your password has been changed.</div>
                <Button asChild className="w-full">
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            ) : !token ? (
              <div className="space-y-4">
                <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">
                  This reset link is incomplete. Open the link from your email again, or request a new one.
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/forgot-password">Request a new link</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                {error && (
                  <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">
                    {error}{" "}
                    {/invalid or has expired/i.test(error) && (
                      <Link to="/forgot-password" className="underline underline-offset-2">
                        Request a new link
                      </Link>
                    )}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
