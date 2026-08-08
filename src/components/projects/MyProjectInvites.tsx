import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SectionHeader, Surface } from "@/components/native-ui";

type Row = {
  id: string;
  project_id: string;
  inviter_id: string;
  role: string | null;
  message: string | null;
  created_at: string;
  project_title?: string;
  inviter?: { full_name: string; avatar_url: string | null };
};

/** Invitations waiting for the current user's response. */
export function MyProjectInvites({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("project_invites")
      .select("id, project_id, inviter_id, role, message, created_at")
      .eq("invitee_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const list = (data ?? []) as Row[];
    if (!list.length) {
      setRows([]);
      return;
    }

    const [{ data: projects }, { data: profiles }] = await Promise.all([
      supabase.from("projects").select("id, title").in("id", list.map((r) => r.project_id)),
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", list.map((r) => r.inviter_id)),
    ]);

    const titles = Object.fromEntries((projects ?? []).map((p) => [p.id, p.title]));
    const people = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    setRows(
      list.map((r) => ({
        ...r,
        project_title: titles[r.project_id],
        inviter: people[r.inviter_id] as Row["inviter"],
      })),
    );
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`my-invites-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_invites", filter: `invitee_id=eq.${userId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const respond = async (row: Row, status: "accepted" | "declined") => {
    setBusy(row.id);
    const { error } = await supabase
      .from("project_invites")
      .update({ status })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      toast.error("Could not update the invite");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    if (status === "accepted") {
      toast.success("You've joined the project");
      navigate(`/projects/${row.project_id}`);
    } else {
      toast.success("Invite declined");
    }
  };

  if (!rows.length) return null;

  return (
    <Surface inset className="space-y-3">
      <SectionHeader
        title="Invitations"
        subtitle={`${rows.length} waiting for you`}
        className="px-0"
        action={<Mail className="h-4 w-4 text-primary" />}
      />
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="space-y-2 rounded-2xl bg-surface-2 p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={row.inviter?.avatar_url ?? undefined} />
                <AvatarFallback>{row.inviter?.full_name?.charAt(0) ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {row.project_title ?? "A project"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {row.inviter?.full_name ?? "A creative"}
                  {row.role ? ` · ${row.role}` : ""} ·{" "}
                  {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            {row.message ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{row.message}</p>
            ) : null}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 rounded-full"
                disabled={busy === row.id}
                onClick={() => void respond(row, "accepted")}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 rounded-full"
                disabled={busy === row.id}
                onClick={() => void respond(row, "declined")}
              >
                Decline
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
