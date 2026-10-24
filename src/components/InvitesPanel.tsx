import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { useControlInvites, useInviteAction, type ControlInvite } from "@/hooks/useControlApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { TablePagination } from "@/components/TablePagination";
import { QueryError } from "@/components/QueryError";
import { ConfirmWithReason } from "@/components/ConfirmWithReason";

/** Invitations across all companies: who was invited, whether it is still good, and the two things support can do. */
export function InvitesPanel() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pending, setPending] = useState<{ invite: ControlInvite; action: "resend" | "revoke" } | null>(null);
  const { data, error, refetch } = useControlInvites({ page, pageSize: 20, search: useDebouncedValue(search.trim()), status: status === "all" ? "" : status.toUpperCase() });
  const act = useInviteAction();
  const { toast } = useToast();
  const assist = can(user?.platformRole, "user.assist");

  async function confirm(reason: string) {
    if (!pending) return;
    const res = await act.mutateAsync({ id: pending.invite.id, action: pending.action, reason });
    toast({ title: pending.action === "revoke" ? "Invitation revoked" : res.emailSent ? "Invitation sent again" : "Invitation renewed, but the email did not go out" });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search email…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && <QueryError error={error} onRetry={() => void refetch()} what="invitations" />}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invited</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="w-[1%]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.data ?? []).map((i) => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.email}</TableCell>
              <TableCell>
                <Link to={`/companies/${i.companyId}`} className="text-primary hover:underline text-sm">{i.companyName}</Link>
              </TableCell>
              <TableCell className="text-sm">{i.roleName}</TableCell>
              <TableCell><StatusBadge status={i.status} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(i.expiresAt).toLocaleDateString()}</TableCell>
              <TableCell>
                {assist && (i.status === "pending" || i.status === "expired") && (
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setPending({ invite: i, action: "resend" })}>Resend</Button>
                    {i.status === "pending" && <Button size="sm" variant="outline" onClick={() => setPending({ invite: i, action: "revoke" })}>Revoke</Button>}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!error && (data?.data?.length ?? 0) === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No invitations.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {data && <TablePagination page={data.page} pageSize={data.pageSize} total={data.total} totalPages={data.totalPages} onPageChange={setPage} />}
      {pending && (
        <ConfirmWithReason
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={pending.action === "resend" ? `Resend invitation to ${pending.invite.email}` : `Revoke invitation for ${pending.invite.email}`}
          description={pending.action === "resend" ? "They get a fresh link by email, valid for 7 days." : "The link stops working. The company's owner can invite them again."}
          confirmLabel={pending.action === "resend" ? "Resend" : "Revoke"}
          destructive={pending.action === "revoke"}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
