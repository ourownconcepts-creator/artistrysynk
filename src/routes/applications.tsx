import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router-compat";
import { toast } from "sonner";
import { buildPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/applications")({
  head: () =>
    buildPageHead({
      path: "/applications",
      title: "Project applications | ArtistrySynk",
      description: "Review applicants to your projects and track projects you've applied to.",
      noIndex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Applications">
        <ApplicationsPage />
      </AppShell>
    </ProtectedRoute>
  ),
});

interface App { id: string; project_id: string; applicant_id: string; message: string | null; status: string; created_at: string; projects: { title: string; created_by: string } | null }

function ApplicationsPage() {
  const [me, setMe] = useState<string | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("project_applications")
      .select("id, project_id, applicant_id, message, status, created_at, projects(title, created_by)")
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (data ?? []) as unknown as App[];
    setApps(rows);
    const ids = [...new Set(rows.map((r) => r.applicant_id))].filter((i) => i !== uid);
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setNames(Object.fromEntries((ps ?? []).map((p) => [p.id, p.full_name ?? "Member"])));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setMe(uid);
      if (uid) void load(uid);
    });
  }, [load]);

  const decide = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("project_applications").update({ status }).eq("id", id);
    if (error) return void toast.error("Couldn't update the application");
    toast.success(status === "accepted" ? "Applicant accepted" : "Application declined");
    if (me) void load(me);
  };

  const incoming = apps.filter((a) => a.projects?.created_by === me);
  const mine = apps.filter((a) => a.applicant_id === me);

  const row = (a: App, owner: boolean) => (
    <div key={a.id} className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{a.projects?.title ?? "Project"}</p>
          {owner && (
            <Link to={`/profile/${a.applicant_id}`} className="text-sm text-primary hover:underline">
              {names[a.applicant_id] ?? "Applicant"}
            </Link>
          )}
        </div>
        <Badge variant="secondary">{a.status}</Badge>
      </div>
      {a.message && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.message}</p>}
      {owner && a.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => decide(a.id, "accepted")}>Accept</Button>
          <Button size="sm" variant="outline" onClick={() => decide(a.id, "rejected")}>Decline</Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Project applications</h1>
        <Button asChild variant="outline"><Link to="/open-projects">Post or find projects</Link></Button>
      </div>
      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">To my projects ({incoming.length})</TabsTrigger>
          <TabsTrigger value="mine">I applied ({mine.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming" className="space-y-3">
          {incoming.length ? incoming.map((a) => row(a, true)) : <p className="text-muted-foreground">No applications yet.</p>}
        </TabsContent>
        <TabsContent value="mine" className="space-y-3">
          {mine.length ? mine.map((a) => row(a, false)) : <p className="text-muted-foreground">You haven't applied to any projects yet.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
