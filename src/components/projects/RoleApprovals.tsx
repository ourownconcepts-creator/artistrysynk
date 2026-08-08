import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserCog, ShieldCheck, Check, X, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Member {
  user_id: string;
  role: string | null;
  can_approve_roles: boolean;
  full_name: string;
  avatar_url: string | null;
}

interface RoleChange {
  id: string;
  member_id: string;
  requested_by: string;
  previous_role: string | null;
  requested_role: string;
  note: string | null;
  status: string;
  created_at: string;
}

interface Props {
  projectId: string;
  currentUserId: string;
  isCreator: boolean;
}

/**
 * Role changes in a project room require approval: a member (or the creator)
 * requests a role, and only the creator or members flagged as role approvers
 * can accept or decline it.
 */
export const RoleApprovals = ({ projectId, currentUserId, isCreator }: Props) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<RoleChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [memberId, setMemberId] = useState("");
  const [requestedRole, setRequestedRole] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [{ data: memberRows }, { data: changeRows }] = await Promise.all([
      supabase
        .from("project_members")
        .select("user_id, role, can_approve_roles, profiles:user_id(full_name, avatar_url)")
        .eq("project_id", projectId),
      supabase
        .from("project_role_changes")
        .select("id, member_id, requested_by, previous_role, requested_role, note, status, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    setMembers(
      (memberRows ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        can_approve_roles: Boolean(m.can_approve_roles),
        full_name: m.profiles?.full_name ?? "Member",
        avatar_url: m.profiles?.avatar_url ?? null,
      })),
    );
    setRequests((changeRows ?? []) as RoleChange[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel(`role-changes-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_role_changes", filter: `project_id=eq.${projectId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, load]);

  const canApprove =
    isCreator || members.some((m) => m.user_id === currentUserId && m.can_approve_roles);

  const submitRequest = async () => {
    if (!memberId || !requestedRole.trim()) {
      toast.error("Pick a member and a role");
      return;
    }
    setSaving("request");
    const previous = members.find((m) => m.user_id === memberId)?.role ?? null;
    const { error } = await supabase.from("project_role_changes").insert({
      project_id: projectId,
      member_id: memberId,
      requested_by: currentUserId,
      previous_role: previous,
      requested_role: requestedRole.trim(),
      note: note.trim() || null,
    });
    setSaving(null);
    if (error) {
      toast.error("Could not submit the role change");
      return;
    }
    toast.success("Role change sent for approval");
    setMemberId("");
    setRequestedRole("");
    setNote("");
    void load();
  };

  const decide = async (id: string, status: "approved" | "declined") => {
    setSaving(id);
    const { error } = await supabase
      .from("project_role_changes")
      .update({ status, reviewed_by: currentUserId })
      .eq("id", id);
    setSaving(null);
    if (error) {
      toast.error("Could not update this request");
      return;
    }
    toast.success(status === "approved" ? "Role approved" : "Role declined");
    void load();
  };

  const toggleApprover = async (member: Member, value: boolean) => {
    setSaving(member.user_id);
    const { error } = await supabase
      .from("project_members")
      .update({ can_approve_roles: value })
      .eq("project_id", projectId)
      .eq("user_id", member.user_id);
    setSaving(null);
    if (error) {
      toast.error("Could not update approvers");
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.user_id === member.user_id ? { ...m, can_approve_roles: value } : m)),
    );
  };

  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending").slice(0, 5);
  const nameOf = (id: string) => members.find((m) => m.user_id === id)?.full_name ?? "Member";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Roles &amp; approvals
          {pending.length ? (
            <Badge variant="secondary" className="text-xs">
              {pending.length} pending
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          New roles only take effect once the project creator or an approver accepts them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2 rounded-xl border p-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Request a role change
              </Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger aria-label="Member">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.full_name}
                      {m.role ? ` — ${m.role}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value)}
                placeholder="New role (e.g. Lead Producer)"
                aria-label="Requested role"
              />
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for approvers"
                aria-label="Note for approvers"
              />
              <Button
                size="sm"
                className="w-full"
                disabled={saving === "request"}
                onClick={() => void submitRequest()}
              >
                {saving === "request" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send for approval
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Pending approvals</p>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No role changes waiting.</p>
              ) : (
                pending.map((r) => (
                  <div key={r.id} className="rounded-xl border p-3">
                    <p className="text-sm font-medium">
                      {nameOf(r.member_id)} → {r.requested_role}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested by {nameOf(r.requested_by)} ·{" "}
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      {r.previous_role ? ` · currently ${r.previous_role}` : ""}
                    </p>
                    {r.note ? <p className="mt-1 text-xs">{r.note}</p> : null}
                    {canApprove ? (
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          disabled={saving === r.id}
                          onClick={() => void decide(r.id, "approved")}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving === r.id}
                          onClick={() => void decide(r.id, "declined")}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="mt-2 text-[10px]">
                        Awaiting approver
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>

            {history.length ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold">Recent decisions</p>
                {history.map((r) => (
                  <p key={r.id} className="text-xs text-muted-foreground">
                    {nameOf(r.member_id)} → {r.requested_role} ·{" "}
                    <span className={r.status === "approved" ? "text-emerald-600" : "text-destructive"}>
                      {r.status}
                    </span>
                  </p>
                ))}
              </div>
            ) : null}

            {isCreator ? (
              <div className="space-y-2 rounded-xl border p-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  Who can approve roles
                </p>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                ) : (
                  members.map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={m.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {m.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">{m.full_name}</span>
                      </div>
                      <Switch
                        checked={m.can_approve_roles}
                        disabled={saving === m.user_id}
                        aria-label={`Allow ${m.full_name} to approve role changes`}
                        onCheckedChange={(v) => void toggleApprover(m, v)}
                      />
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
};
