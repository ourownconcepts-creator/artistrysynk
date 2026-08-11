import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AtSign } from "lucide-react";

type Row = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  change_count: number;
  first_changed_at: string | null;
  last_changed_at: string | null;
  history: { old: string | null; new: string | null; at: string }[];
};

/**
 * Admin view of how often members have changed their handle. Backed by the
 * role-gated admin_username_change_stats RPC, so no client-side trust.
 */
export const UsernameChangesPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_username_change_stats", {
      _search: term || undefined,
      _limit: 100,
    });
    setLoading(false);
    if (error) return;
    setRows((data ?? []) as unknown as Row[]);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by username or display name"
        aria-label="Search members by username"
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No member has changed their username yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((r) => (
            <li key={r.user_id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-medium">
                    <AtSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {r.username ?? "unclaimed"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.display_name ?? "No display name"} · last changed{" "}
                    {r.last_changed_at ? new Date(r.last_changed_at).toLocaleString() : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.change_count > 2 ? "destructive" : "secondary"}>
                    {r.change_count} {r.change_count === 1 ? "change" : "changes"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenId(openId === r.user_id ? null : r.user_id)}
                  >
                    {openId === r.user_id ? "Hide history" : "View history"}
                  </Button>
                </div>
              </div>

              {openId === r.user_id ? (
                <ol className="mt-3 space-y-1 border-l pl-4 text-xs text-muted-foreground">
                  {r.history.map((h) => (
                    <li key={`${h.at}-${h.old}`}>
                      @{h.old} → @{h.new} · {new Date(h.at).toLocaleString()}
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
