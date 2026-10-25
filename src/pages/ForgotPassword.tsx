import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { FieldError } from "@/components/FieldError";

const schema = z.object({ email: z.string().trim().min(1, "Enter your email").email("Enter a valid email") });
type Values = z.infer<typeof schema>;

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const [error, setError] = useState<string | null>(null);

  const submit = async ({ email }: Values) => {
    setError(null);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      // Whether the address has an account is never revealed. Only problems that are not about the
      // address (offline, rate limited) are shown.
      const status = (err as { status?: number }).status;
      if (status === 0 || status === 429) setError(err instanceof Error ? err.message : "Please try again shortly.");
      else setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Logo size={64} />
          <h1 className="text-2xl font-bold tracking-tight">Console</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reset your password</CardTitle>
            <CardDescription>Enter your Fillo email and we will send you a link to choose a new password.</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="rounded-md bg-primary/10 text-sm px-3 py-2">
                  If an account exists for that email, a reset link is on its way. It works once and expires in 60 minutes.
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">Back to sign in</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" placeholder="you@fillo.cloud" aria-invalid={!!errors.email} aria-describedby="email-error" {...register("email")} />
                  <FieldError id="email-error" message={errors.email?.message} />
                </div>
                {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send reset link
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  <Link to="/login" className="underline underline-offset-2">
                    Back to sign in
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
