import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { useControlInvites, useInviteAction, type ControlInvite } from "@/hooks/useControlApi";
import { apiValue, useTableState } from "@/hooks/useTableState";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmWithReason } from "@/components/ConfirmWithReason";
import { DataTable, SearchBox, type Column } from "@/components/DataTable";

/**
 * Invitations across all companies (or one, with `companyId`): who was invited, whether it is still good, and
 * the two things support can do. Its state sits in the address under `inv_…` when shown on its own page; inside a
 * company's tab it stays in memory so it never fights the tab for the address.
 */
export function InvitesPanel({ companyId }: { companyId?: string } = {}) {
  const { user } = useAuth();
  const t = useTableState({ prefix: "inv_", syncUrl: !companyId });
  const [pending, setPending] = useState<{ invite: ControlInvite; action: "resend" | "revoke" } | null>(null);
  const { data, isLoading, error, refetch } = useControlInvites({ page: t.page, pageSize: 20, companyId, search: t.filter("search"), status: apiValue(t.filter("status")).toUpperCase(), sort: t.sort });
  const act = useInviteAction();
  const { toast } = useToast();
  const assist = can(user?.platformRole, "user.assist");

  async function confirm(reason: string) {
    if (!pending) return;
    const res = await act.mutateAsync({ id: pending.invite.id, action: pending.action, reason });
    toast({ title: pending.action === "revoke" ? "Invitation revoked" : res.emailSent ? "Invitation sent again" : "Invitation renewed, but the email did not go out" });
  }

  const columns: Column<ControlInvite>[] = [
    { key: "email", header: "Invited", sortKey: "email", className: "font-medium", cell: (i) => i.email },
    ...(companyId
      ? []
      : [{ key: "company", header: "Company", cell: (i: ControlInvite) => <Link to={`/companies/${i.companyId}`} className="text-primary hover:underline text-sm">{i.companyName}</Link> }]),
    { key: "role", header: "Role", secondary: true, className: "text-sm", cell: (i) => i.roleName },
    { key: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} /> },
    { key: "expires", header: "Expires", sortKey: "expiresAt", secondary: true, className: "text-sm text-muted-foreground", cell: (i) => new Date(i.expiresAt).toLocaleDateString() },
    {
      key: "actions",
      header: "",
      className: "w-[1%]",
      cell: (i) =>
        assist && (i.status === "pending" || i.status === "expired") ? (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setPending({ invite: i, action: "resend" })}>Resend</Button>
            {i.status === "pending" && <Button size="sm" variant="outline" onClick={() => setPending({ invite: i, action: "revoke" })}>Revoke</Button>}
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBox value={t.filter("search")} onChange={(v) => t.setFilter("search", v)} placeholder="Search email…" />
        <Select value={t.filter("status") || "all"} onValueChange={(v) => t.setFilter("status", v)}>
          <SelectTrigger className="w-[160px]" aria-label="Invitation status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={columns}
        rows={data?.data}
        rowKey={(i) => i.id}
        what="invitations"
        empty="No invitations."
        loading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        pagination={data}
        onPageChange={t.setPage}
        sort={t.sort}
        onSortChange={t.setSort}
      />
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
