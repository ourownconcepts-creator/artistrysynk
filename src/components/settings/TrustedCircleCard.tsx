import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Handshake, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTrustedIntroduction,
  fetchTrustedCircle,
  respondToTrust,
  type TrustedRelationship,
} from "@/lib/identity";

type Person = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };

/** Approve, decline or revoke trusted connections and introductions. */
export const TrustedCircleCard = () => {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<TrustedRelationship[]>([]);
  const [accepted, setAccepted] = useState<TrustedRelationship[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [introSubject, setIntroSubject] = useState<string | null>(null);
  const [introRecipient, setIntroRecipient] = useState<string>("");
  const [introBusy, setIntroBusy] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const circle = await fetchTrustedCircle(user.id);
    setIncoming(circle.incoming);
    setAccepted(circle.accepted);

    const ids = Array.from(
      new Set(
        [...circle.incoming, ...circle.accepted].flatMap((r) =>
          [r.user_id, r.related_user_id].filter((id) => id !== user.id),
        ),
      ),
    );
    if (ids.length) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);
      setPeople(Object.fromEntries(((data ?? []) as Person[]).map((p) => [p.id, p])));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, status: "accepted" | "declined" | "revoked") => {
    setBusyId(id);
    const error = await respondToTrust(id, status);
    setBusyId(null);
    if (error) {
      toast.error("Could not update that request.");
      return;
    }
    toast.success(
      status === "accepted" ? "Added to your trusted circle." : "Trusted circle updated.",
    );
    void load();
  };

  const otherId = (r: TrustedRelationship) =>
    r.user_id === userId ? r.related_user_id : r.user_id;

  const circleIds = accepted.map(otherId);

  const sendIntroduction = async () => {
    if (!introSubject || !introRecipient) return;
    setIntroBusy(true);
    const error = await createTrustedIntroduction(
      introSubject,
      introRecipient,
      "I think you two should work together.",
    );
    setIntroBusy(false);
    if (error) {
      toast.error(error.message || "Could not send that introduction.");
      return;
    }
    toast.success("Introduction sent — they decide whether to accept.");
    setIntroSubject(null);
    setIntroRecipient("");
  };

  const row = (r: TrustedRelationship, actions: React.ReactNode) => {
    const p = people[otherId(r)];
    return (
      <li key={r.id} className="flex items-center gap-3 py-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={p?.avatar_url ?? undefined} alt={p?.full_name ?? "Member"} />
          <AvatarFallback>{p?.full_name?.charAt(0) ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{p?.full_name ?? "ArtistrySynk member"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {p?.username ? `@${p.username} · ` : ""}
            {r.kind.replace(/_/g, " ")}
            {r.source === "trusted_introduction" ? " · introduced" : ""}
          </p>
          {r.message ? <p className="truncate text-xs text-muted-foreground">“{r.message}”</p> : null}
        </div>
        {actions}
      </li>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Trusted circle
        </CardTitle>
        <CardDescription>
          People you approve here can always see you — even in Private or Invisible mode — and can
          introduce you to others when you allow it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Handshake className="h-4 w-4" aria-hidden="true" />
            Pending requests
            <Badge variant="secondary">{incoming.length}</Badge>
          </p>
          {incoming.length === 0 ? (
            <p className="pt-1 text-sm text-muted-foreground">No requests waiting on you.</p>
          ) : (
            <ul className="divide-y">
              {incoming.map((r) =>
                row(
                  r,
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busyId === r.id} onClick={() => void act(r.id, "accepted")}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === r.id}
                      onClick={() => void act(r.id, "declined")}
                    >
                      Decline
                    </Button>
                  </div>,
                ),
              )}
            </ul>
          )}
        </div>

        <Separator />

        <div>
          <p className="text-sm font-semibold">
            Approved <Badge variant="secondary">{accepted.length}</Badge>
          </p>
          {accepted.length === 0 ? (
            <p className="pt-1 text-sm text-muted-foreground">Your trusted circle is empty.</p>
          ) : (
            <ul className="divide-y">
              {accepted.map((r) =>
                row(
                  r,
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setIntroSubject(otherId(r))}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Introduce
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === r.id || r.user_id !== userId}
                      onClick={() => void act(r.id, "revoked")}
                    >
                      Remove
                    </Button>
                  </div>,
                ),
              )}
            </ul>
          )}
        </div>
      </CardContent>

      <Dialog open={!!introSubject} onOpenChange={(open) => !open && setIntroSubject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make an introduction</DialogTitle>
            <DialogDescription>
              Pick someone else from your trusted circle. They only gain access if
              {" "}
              {introSubject ? (people[introSubject]?.full_name ?? "your contact") : "your contact"}
              {" "}accepts.
            </DialogDescription>
          </DialogHeader>
          <Select value={introRecipient} onValueChange={setIntroRecipient}>
            <SelectTrigger className="min-h-11">
              <SelectValue placeholder="Introduce them to…" />
            </SelectTrigger>
            <SelectContent>
              {circleIds
                .filter((id) => id !== introSubject)
                .map((id) => (
                  <SelectItem key={id} value={id}>
                    {people[id]?.full_name ?? `@${people[id]?.username ?? id.slice(0, 8)}`}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntroSubject(null)}>
              Cancel
            </Button>
            <Button onClick={() => void sendIntroduction()} disabled={introBusy || !introRecipient}>
              {introBusy ? "Sending…" : "Send introduction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};