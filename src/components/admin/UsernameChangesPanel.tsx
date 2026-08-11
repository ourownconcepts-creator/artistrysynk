import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AtSign, X } from "lucide-react";
import { Label } from "@/components/ui/label";

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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(
    async (term: string, fromDate: string, toDate: string) => {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_username_change_stats", {
        _search: term || undefined,
        _limit: 100,
        _from: fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined,
        _to: toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined,
      });
      setLoading(false);
      if (error) return;
      setRows((data ?? []) as unknown as Row[]);
    },
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => void load(search.trim(), from, to), 350);
    return () => clearTimeout(t);
  }, [search, from, to, load]);

  const hasFilters = search !== "" || from !== "" || to !== "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1 space-y-1">
          <Label htmlFor="uc-search" className="text-xs">
            Search
          </Label>
          <Input
            id="uc-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Current or previous username, display name"
            aria-label="Search members by username or display name"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="uc-from" className="text-xs">
            Changed from
          </Label>
          <Input
            id="uc-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="uc-to" className="text-xs">
            Changed to
          </Label>
          <Input
            id="uc-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFrom("");
              setTo("");
            }}
          >
            <X className="mr-1 h-4 w-4" aria-hidden="true" />
            Clear
          </Button>
        ) : null}
      </div>

      {!loading && rows.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {rows.length} member{rows.length === 1 ? "" : "s"} matched
          {from || to ? " in the selected window" : ""}.
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {hasFilters
            ? "No username changes match these filters."
            : "No member has changed their username yet."}
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
