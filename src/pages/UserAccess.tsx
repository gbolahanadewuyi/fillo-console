import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { useUserAccess, useUserAction, useInviteAction, type AccessFinding, type UserActionName } from "@/hooks/useControlApi";
import { ApiError } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { QueryError } from "@/components/QueryError";
import { ConfirmWithReason } from "@/components/ConfirmWithReason";
import { useToast } from "@/hooks/use-toast";

type Pending = { kind: "user"; action: UserActionName } | { kind: "invite"; action: "resend" | "revoke" };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }) : "Never");

const ICON = { blocking: CircleAlert, warning: TriangleAlert, info: Info } as const;
const TONE = { blocking: "text-red-600", warning: "text-amber-600", info: "text-muted-foreground" } as const;

const ACTION_LABEL: Record<NonNullable<AccessFinding["action"]>, string> = {
  "user.unlock": "Unlock login",
  "user.sendReset": "Send reset email",
  "user.reactivate": "Reactivate",
  "invite.resend": "Resend invitation",
};

export default function UserAccess() {
  const { id } = useParams();
  const { user: staff } = useAuth();
  const { data, error, refetch } = useUserAccess(id);
  const userAction = useUserAction();
  const inviteAction = useInviteAction();
  const { toast } = useToast();
  const [pending, setPending] = useState<Pending | null>(null);

  const assist = can(staff?.platformRole, "user.assist");
  const suspend = can(staff?.platformRole, "user.suspend");

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <QueryError error={error} onRetry={() => void refetch()} what="this person" />
      </div>
    );
  }
  if (!data) return <BackLink />;

  const { user, signIn, invite } = data;
  const isStaffAccount = data.findings.some((f) => f.code === "platform_account");

  function startFinding(action: NonNullable<AccessFinding["action"]>) {
    if (action === "invite.resend") setPending({ kind: "invite", action: "resend" });
    else setPending({ kind: "user", action: action === "user.unlock" ? "unlock" : action === "user.sendReset" ? "send-reset" : "reactivate" });
  }

  async function confirm(reason: string) {
    if (!pending) return;
    try {
      if (pending.kind === "user") {
        await userAction.mutateAsync({ id: user.id, action: pending.action, reason });
        toast({ title: DONE[pending.action] });
      } else {
        const res = await inviteAction.mutateAsync({ id: invite!.id, action: pending.action, reason });
        toast({ title: pending.action === "revoke" ? "Invitation revoked" : res.emailSent ? "Invitation sent again" : "Invitation renewed, but the email did not go out" });
      }
    } catch (e) {
      throw e instanceof ApiError || e instanceof Error ? e : new Error("The action failed.");
    }
  }

  const copy = pending ? COPY(pending, user.name, user.email) : null;
  const canResend = assist && !isStaffAccount && invite && (invite.status === "PENDING" || invite.status === "EXPIRED") && !signIn.hasLogin;
  const resetOffered = assist && !isStaffAccount && signIn.hasLogin;
  const unlockOffered = assist && !isStaffAccount && signIn.hasLogin && !!signIn.lockedUntil;

  return (
    <div className="space-y-4">
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {user.email} · <Link to={`/companies/${user.companyId}`} className="text-primary hover:underline">{user.companyName}</Link> · {user.roleName}
            {user.stationName ? ` · ${user.stationName}` : ""}
          </p>
        </div>
        <StatusBadge status={user.status} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {data.canSignIn ? <CircleCheck className="h-5 w-5 text-emerald-600" /> : <CircleAlert className="h-5 w-5 text-red-600" />}
            {data.canSignIn ? "Can sign in" : "Cannot use the app right now"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.findings.length === 0 && <p className="text-sm text-muted-foreground">Nothing is blocking this person.</p>}
          <ul className="space-y-3">
            {data.findings.map((f) => {
              const Icon = ICON[f.severity];
              const offered = f.action && assist && !isStaffAccount && (f.action !== "invite.resend" || canResend);
              return (
                <li key={f.code} className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE[f.severity]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{f.title}</div>
                    <div className="text-sm text-muted-foreground">{f.detail}</div>
                  </div>
                  {offered && (
                    <Button size="sm" variant="outline" onClick={() => startFinding(f.action!)}>
                      {ACTION_LABEL[f.action!]}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sign-in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Login">{signIn.hasLogin ? "Has a password" : "None yet"}</Row>
            <Row label="Last signed in">{when(signIn.lastLoginAt)}</Row>
            <Row label="Password changed">{when(signIn.passwordUpdatedAt)}</Row>
            <Row label="Wrong passwords">{signIn.failedAttempts}</Row>
            {signIn.lockedUntil && <Row label="Locked until">{when(signIn.lockedUntil)}</Row>}
            {invite && (
              <Row label="Invitation">
                <StatusBadge status={invite.status === "PENDING" && new Date(invite.expiresAt) <= new Date() ? "expired" : invite.status.toLowerCase()} />
              </Row>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {isStaffAccount && <p className="text-sm text-muted-foreground">Fillo staff accounts are managed outside the console.</p>}
            {unlockOffered && <Button size="sm" variant="outline" onClick={() => setPending({ kind: "user", action: "unlock" })}>Unlock login</Button>}
            {resetOffered && <Button size="sm" variant="outline" onClick={() => setPending({ kind: "user", action: "send-reset" })}>Send reset email</Button>}
            {canResend && <Button size="sm" variant="outline" onClick={() => setPending({ kind: "invite", action: "resend" })}>Resend invitation</Button>}
            {assist && !isStaffAccount && invite?.status === "PENDING" && !signIn.hasLogin && (
              <Button size="sm" variant="outline" onClick={() => setPending({ kind: "invite", action: "revoke" })}>Revoke invitation</Button>
            )}
            {assist && !isStaffAccount && user.status === "suspended" && <Button size="sm" onClick={() => setPending({ kind: "user", action: "reactivate" })}>Reactivate</Button>}
            {suspend && !isStaffAccount && !user.isOwner && user.status === "active" && (
              <Button size="sm" variant="destructive" onClick={() => setPending({ kind: "user", action: "suspend" })}>Suspend</Button>
            )}
            {!assist && <p className="text-sm text-muted-foreground">Your role can look but not change.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 && <p className="text-sm text-muted-foreground">Nothing recorded.</p>}
          <ul className="divide-y">
            {data.recentActivity.map((a) => (
              <li key={a.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="font-mono text-xs">{a.action}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{when(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {copy && (
        <ConfirmWithReason
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={copy.title}
          description={copy.description}
          confirmLabel={copy.confirm}
          destructive={copy.destructive}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Users
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

const DONE: Record<UserActionName, string> = {
  unlock: "Login unlocked",
  "send-reset": "Reset email sent",
  reactivate: "Person reactivated",
  suspend: "Person suspended",
};

function COPY(p: Pending, name: string, email: string) {
  if (p.kind === "invite") {
    return p.action === "resend"
      ? { title: `Resend invitation to ${email}`, description: "They get a fresh link by email, valid for 7 days. The old link keeps working until it expires.", confirm: "Resend", destructive: false }
      : { title: `Revoke invitation for ${email}`, description: "The link stops working. The company's owner can invite them again.", confirm: "Revoke", destructive: true };
  }
  switch (p.action) {
    case "unlock":
      return { title: `Unlock ${name}`, description: "Clears the wrong-password lock so they can try again now. Their password is not changed.", confirm: "Unlock", destructive: false };
    case "send-reset":
      return { title: `Email ${name} a reset link`, description: `A password reset link goes to ${email}. They choose their own password. Nothing is changed until they use it.`, confirm: "Send email", destructive: false };
    case "reactivate":
      return { title: `Reactivate ${name}`, description: "They can use the app again straight away.", confirm: "Reactivate", destructive: false };
    case "suspend":
      return { title: `Suspend ${name}`, description: "They are refused on every request until reactivated. Their data is kept.", confirm: "Suspend", destructive: true };
  }
}
