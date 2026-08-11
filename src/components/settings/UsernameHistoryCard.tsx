import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { History, Info, Loader2 } from "lucide-react";

type Entry = { old_username: string | null; new_username: string | null; changed_at: string };

/**
 * Member-facing timeline of handle changes, plus how old links behave.
 */
export const UsernameHistoryCard = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("my_username_history");
      setEntries((data ?? []) as unknown as Entry[]);
      setLoading(false);
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" aria-hidden="true" />
          Username history
        </CardTitle>
        <CardDescription>Every handle change on your account, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t changed your username yet.
          </p>
        ) : (
          <ol className="space-y-3 border-l pl-4">
            {entries.map((e) => (
              <li key={`${e.changed_at}-${e.old_username}`} className="relative">
                <span
                  className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">
                  @{e.old_username} → @{e.new_username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.changed_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your profile link always follows your current handle. Links using an old handle stop
            resolving once it is released, so share your permanent ID link if you need something
            that never changes. Old handles stay reserved for a short period before anyone else can
            claim them.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
