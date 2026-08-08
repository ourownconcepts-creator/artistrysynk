import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { BellOff, Loader2 } from "lucide-react";

interface MutedRow {
  id: string;
  muted_id: string;
  created_at: string;
  profile?: { full_name: string | null; username: string | null; avatar_url: string | null };
}

export const MutedUsersList = ({ userId }: { userId: string }) => {
  const [rows, setRows] = useState<MutedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("muted_users")
      .select("id, muted_id, created_at")
      .eq("muter_id", userId)
      .order("created_at", { ascending: false });

    const ids = (data || []).map((r) => r.muted_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profiles || []).map((p) => [p.id, p]));
    setRows((data || []).map((r) => ({ ...r, profile: map.get(r.muted_id) })));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const unmute = async (id: string) => {
    const { error } = await supabase.from("muted_users").delete().eq("id", id);
    if (error) {
      toast.error("Could not unmute");
      return;
    }
    toast.success("Unmuted");
    void load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellOff className="h-5 w-5" />
          Muted creatives
        </CardTitle>
        <CardDescription>
          Muted people stay hidden from discovery and the collaboration feed, but your existing
          conversations are untouched.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven't muted anyone.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={row.profile?.avatar_url || undefined} alt="" />
                  <AvatarFallback>
                    {(row.profile?.full_name || row.profile?.username || "?").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {row.profile?.full_name || row.profile?.username || "Unknown creative"}
                  </p>
                  <p className="text-xs text-muted-foreground">Muted</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => void unmute(row.id)}
                >
                  Unmute
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
