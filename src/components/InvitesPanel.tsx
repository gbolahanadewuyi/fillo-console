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
import { EditInviteDialog } from "@/components/EditInviteDialog";
import { ConfirmAction } from "@/components/ConfirmAction";
import { DataTable, SearchBox, type Column } from "@/components/DataTable";
import { usePageSize } from "@/lib/page-size";

/**
 * Invitations across all companies (or one, with `companyId`): who was invited, whether it is still good, and
 * the two things support can do. Its state sits in the address under `inv_…` when shown on its own page; inside a
 * company's tab it stays in memory so it never fights the tab for the address.
 */
export function InvitesPanel({ companyId }: { companyId?: string } = {}) {
  const pageSize = usePageSize();
  const { user } = useAuth();
  const t = useTableState({ prefix: "inv_", syncUrl: !companyId });
  const [revoking, setRevoking] = useState<ControlInvite | null>(null);
  const [editing, setEditing] = useState<ControlInvite | null>(null);
  const { data, isLoading, error, refetch } = useControlInvites({ page: t.page, pageSize, companyId, search: t.filter("search"), status: apiValue(t.filter("status")).toUpperCase(), sort: t.sort });
  const act = useInviteAction();
  const { toast } = useToast();
  const assist = can(user?.platformRole, "user.assist");

  /** Resending is routine and just happens. Revoking asks "are you sure": a revoked owner invitation cannot be sent again. */
  async function resend(invite: ControlInvite) {
    try {
      const res = await act.mutateAsync({ id: invite.id, action: "resend" });
      toast({ title: res.emailSent ? "Invitation sent again" : "Invitation renewed, but the email did not go out" });
    } catch (e) {
      toast({ title: "It did not work", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" as never });
    }
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
            <Button size="sm" variant="outline" onClick={() => setEditing(i)}>Edit</Button>
            <Button size="sm" variant="outline" onClick={() => void resend(i)} disabled={act.isPending}>Resend</Button>
            {i.status === "pending" && <Button size="sm" variant="outline" onClick={() => setRevoking(i)}>Revoke</Button>}
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
      {revoking && (
        <ConfirmAction
          open
          onOpenChange={(open) => !open && setRevoking(null)}
          title={`Revoke invitation for ${revoking.email}`}
          description="The link stops working and cannot be sent again. The company's owner has to invite them again."
          confirmLabel="Revoke"
          destructive
          onConfirm={async () => {
            await act.mutateAsync({ id: revoking.id, action: "revoke" });
            toast({ title: "Invitation revoked" });
          }}
        />
      )}
      {editing && <EditInviteDialog key={editing.id} invite={editing} open onOpenChange={(o) => { if (!o) setEditing(null); }} />}
    </div>
  );
}
