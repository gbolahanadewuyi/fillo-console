import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { OwnAuthError, resetPassword } from "@/lib/own-auth";

import { FieldError } from "@/components/FieldError";

const MIN_LENGTH = 10;

const schema = z
  .object({ password: z.string().min(MIN_LENGTH, `Use at least ${MIN_LENGTH} characters.`), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The two passwords do not match." });
type Values = z.infer<typeof schema>;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });
  const [error, setError] = useState<string | null>(null);

  const submit = async ({ password }: Values) => {
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof OwnAuthError ? err.message : "Network error. Check your connection and try again.");
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
              <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby="password-error" {...register("password")} />
                  <FieldError id="password-error" message={errors.password?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} aria-describedby="confirm-error" {...register("confirm")} />
                  <FieldError id="confirm-error" message={errors.confirm?.message} />
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
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
