import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { useCaseAction, useControlCase } from "@/hooks/useControlApi";
import { lagos } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { QueryError } from "@/components/QueryError";

const Back = () => (
  <Link to="/cases" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
    <ArrowLeft className="h-4 w-4" /> Cases
  </Link>
);

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: c, error, refetch } = useControlCase(id);
  const act = useCaseAction();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const canWrite = can(user?.platformRole, "case.write");

  if (error) {
    return (
      <div className="space-y-4">
        <Back />
        <QueryError error={error} onRetry={() => void refetch()} what="this case" />
      </div>
    );
  }
  if (!c) return <Back />;

  async function run(action: "note" | "resolve" | "reopen") {
    try {
      await act.mutateAsync({ id: c!.id, action, text: text.trim() || undefined });
      setText("");
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : "Error", variant: "destructive" as never });
    }
  }

  const links = [
    { label: "Company", to: `/companies/${c.companyId}`, text: c.companyName },
    c.user && { label: "Person", to: `/users/${c.user.id}`, text: c.user.name ?? "Person no longer exists" },
    c.order && { label: "Order", to: `/orders/${c.order.id}`, text: c.order.orderNumber ? `#${c.order.orderNumber}` : "Order no longer exists" },
    c.posTransaction && { label: "Transaction", to: `/payments?companyId=${c.companyId}`, text: c.posTransaction.externalReference ?? "Transaction no longer exists" },
  ].filter(Boolean) as { label: string; to: string; text: string }[];

  return (
    <div className="space-y-4">
      <Back />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{c.title}</h1>
          <p className="text-sm text-muted-foreground">
            Opened {lagos(c.createdAt)}{c.createdBy ? ` by ${c.createdBy}` : ""}
            {c.resolvedAt ? ` · resolved ${lagos(c.resolvedAt)}${c.resolvedBy ? ` by ${c.resolvedBy}` : ""}` : ""}
          </p>
        </div>
        <StatusBadge status={c.status} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-x-6 gap-y-2 pt-6 text-sm">
          {links.map((l) => (
            <div key={l.label}>
              <span className="text-muted-foreground">{l.label}: </span>
              <Link to={l.to} className="font-medium text-primary hover:underline">{l.text}</Link>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {c.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
          <ul className="space-y-3">
            {c.notes.map((n) => (
              <li key={n.id} className="text-sm">
                <div className="text-xs text-muted-foreground">{n.author ?? "Unknown"} · {lagos(n.createdAt)}</div>
                <div className="whitespace-pre-wrap">{n.body}</div>
              </li>
            ))}
          </ul>
          {canWrite ? (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="case-text">Add a note</Label>
              <Textarea id="case-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void run("note")} disabled={!text.trim() || act.isPending}>Add note</Button>
                {c.status === "OPEN" ? (
                  <Button size="sm" variant="outline" onClick={() => void run("resolve")} disabled={act.isPending}>Resolve</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => void run("reopen")} disabled={act.isPending}>Reopen</Button>
                )}
              </div>
            </div>
          ) : (
            <p className="border-t pt-4 text-sm text-muted-foreground">Your role can read cases but not add to them.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
