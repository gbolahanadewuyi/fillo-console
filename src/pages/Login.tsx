import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { FieldError } from "@/components/FieldError";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/services/api";
import { mockPlatformUsers, MOCK_PLATFORM_PASSWORD, getPlatformRoleMeta } from "@/lib/mock/users";

const schema = z.object({ email: z.string().trim().min(1, "Enter your email").email("Enter a valid email"), password: z.string().min(1, "Enter your password") });
type Values = z.infer<typeof schema>;

// The demo accounts exist only in the local Auth emulator. Real builds must not advertise them.
const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === "true";

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async ({ email, password }: Values) => {
    setError(null);
    try {
      await login(email, password);
      toast({ title: "Welcome", description: "Signed in to Fillo Console." });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Sign-in failed.");
    }
  };

  const fillDemo = (demoEmail: string) => {
    setValue("email", demoEmail);
    setValue("password", MOCK_PLATFORM_PASSWORD);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Logo size={64} />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Console</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@fillo.cloud" aria-invalid={!!errors.email} aria-describedby="email-error" {...register("email")} />
                <FieldError id="email-error" message={errors.email?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby="password-error" {...register("password")} />
                <FieldError id="password-error" message={errors.password?.message} />
              </div>
              {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
              <p className="text-xs text-center">
                <Link to="/forgot-password" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
                  Forgot your password?
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {SHOW_DEMO_ACCOUNTS && (
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
        )}

      </div>
    </div>
  );
}
