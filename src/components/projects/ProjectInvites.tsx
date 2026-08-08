import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserPlus, Search, X, Check, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BottomSheet, EmptyState, Pressable, SectionHeader, Surface } from "@/components/native-ui";

type Invite = {
  id: string;
  invitee_id: string;
  role: string | null;
  message: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  profile?: { full_name: string; username: string; avatar_url: string | null };
};

type Candidate = { id: string; full_name: string; username: string; avatar_url: string | null };

const statusTone: Record<string, { label: string; variant: "secondary" | "default" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  accepted: { label: "Accepted", variant: "default", icon: Check },
  declined: { label: "Declined", variant: "outline", icon: X },
};

/** Invite specific creatives to a project room and track their response. */
export function ProjectInvites({
  projectId,
  currentUserId,
  canInvite,
}: {
  projectId: string;
  currentUserId: string;
  canInvite: boolean;
}) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("project_invites")
      .select("id, invitee_id, role, message, status, created_at, responded_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as Invite[];
    const ids = [...new Set(rows.map((r) => r.invitee_id))];
    let profiles: Record<string, Candidate> = {};
    if (ids.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);
      profiles = Object.fromEntries((p ?? []).map((x) => [x.id, x as Candidate]));
    }
    setInvites(rows.map((r) => ({ ...r, profile: profiles[r.invitee_id] })));
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live sync of invite responses
  useEffect(() => {
    const channel = supabase
      .channel(`project-invites-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_invites", filter: `project_id=eq.${projectId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, load]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const safe = q.replace(/[%,()]/g, " ");
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`)
        .neq("id", currentUserId)
        .limit(8);
      setResults((data ?? []) as Candidate[]);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  const invitedIds = useMemo(() => new Set(invites.map((i) => i.invitee_id)), [invites]);

  const sendInvite = async () => {
    if (!selected) return;
    setSending(true);
    const { error } = await supabase.from("project_invites").insert({
      project_id: projectId,
      inviter_id: currentUserId,
      invitee_id: selected.id,
      role: role.trim() || null,
      message: message.trim() || null,
    });
    setSending(false);
    if (error) {
      toast.error(
        error.code === "23505" || error.message.includes("duplicate")
          ? "That creative has already been invited"
          : "Could not send the invite",
      );
      return;
    }
    toast.success(`Invite sent to ${selected.full_name}`);
    setSelected(null);
    setRole("");
    setMessage("");
    setQuery("");
    setOpen(false);
    void load();
  };

  const cancelInvite = async (id: string) => {
    const { error } = await supabase.from("project_invites").delete().eq("id", id);
    if (error) {
      toast.error("Could not cancel the invite");
      return;
    }
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <Surface inset className="space-y-3">
      <SectionHeader
        title="Invites"
        subtitle={`${invites.filter((i) => i.status === "pending").length} pending`}
        className="px-0"
        action={
          canInvite ? (
            <Pressable
              onClick={() => setOpen(true)}
              aria-label="Invite a creative"
              className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite
            </Pressable>
          ) : undefined
        }
      />

      {invites.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-5 w-5" />}
          title="No invites yet"
          description="Invite specific creatives and track who accepts."
        />
      ) : (
        <div className="space-y-2">
          {invites.map((invite) => {
            const tone = statusTone[invite.status] ?? statusTone.pending;
            const Icon = tone.icon;
            return (
              <div key={invite.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={invite.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{invite.profile?.full_name?.charAt(0) ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {invite.profile?.full_name ?? "Creative"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {invite.role ? `${invite.role} · ` : ""}
                    {formatDistanceToNow(new Date(invite.responded_at ?? invite.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Badge variant={tone.variant} className="gap-1 text-[10px]">
                  <Icon className="h-3 w-3" />
                  {tone.label}
                </Badge>
                {canInvite && invite.status === "pending" ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label="Cancel invite"
                    onClick={() => void cancelInvite(invite.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Invite a creative"
        description="Search by name or @username, then send the invite."
      >
        <div className="space-y-4 pb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              placeholder="Search creatives"
              aria-label="Search creatives to invite"
              className="rounded-2xl pl-9"
            />
          </div>

          {selected ? (
            <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selected.avatar_url ?? undefined} />
                <AvatarFallback>{selected.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{selected.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">@{selected.username}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Clear selection" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : results.length ? (
            <div className="space-y-1">
              {results.map((r) => (
                <Pressable
                  key={r.id}
                  onClick={() => setSelected(r)}
                  aria-label={`Select ${r.full_name}`}
                  className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-surface-2"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={r.avatar_url ?? undefined} />
                    <AvatarFallback>{r.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{r.username}</p>
                  </div>
                  {invitedIds.has(r.id) ? (
                    <Badge variant="outline" className="text-[10px]">
                      Invited
                    </Badge>
                  ) : null}
                </Pressable>
              ))}
            </div>
          ) : query.trim().length >= 2 ? (
            <p className="px-1 text-xs text-muted-foreground">No creatives found for "{query}"</p>
          ) : null}

          <div className="space-y-2">
            <Label>Proposed role</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Mixing engineer"
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell them what you need and the timeline."
              className="rounded-2xl"
            />
          </div>

          <Button
            onClick={sendInvite}
            disabled={!selected || sending}
            className="w-full rounded-full"
          >
            {sending ? "Sending..." : "Send invite"}
          </Button>
        </div>
      </BottomSheet>
    </Surface>
  );
}
