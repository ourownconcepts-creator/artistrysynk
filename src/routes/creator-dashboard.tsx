import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { AvailabilityCalendar } from "@/components/profile/AvailabilityCalendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/lib/router-compat";
import { buildPageHead } from "@/lib/seoHead";
import { db } from "@/lib/collab";

export const Route = createFileRoute("/creator-dashboard")({
  head: () =>
    buildPageHead({
      path: "/creator-dashboard",
      title: "Creator dashboard | ArtistrySynk",
      description: "Edit your profile, set availability and manage proposals and bookings.",
      noIndex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Creator dashboard">
        <Dashboard />
      </AppShell>
    </ProtectedRoute>
  ),
});

function Dashboard() {
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [counts, setCounts] = useState({ proposals: 0, bookings: 0, applications: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
      setMe({ id: uid, name: p?.full_name ?? "You" });
      const [pr, bk, ap] = await Promise.all([
        db("collaboration_proposals").select("id", { count: "exact", head: true }).eq("recipient_id", uid).eq("status", "pending"),
        db("booking_requests").select("id", { count: "exact", head: true }).eq("creative_id", uid).eq("status", "pending"),
        supabase.from("project_applications").select("id, projects!inner(created_by)", { count: "exact", head: true }).eq("projects.created_by", uid).eq("status", "pending"),
      ]);
      setCounts({ proposals: pr.count ?? 0, bookings: bk.count ?? 0, applications: ap.count ?? 0 });
    })();
  }, []);

  const tiles = [
    { title: "Proposals", count: counts.proposals, to: "/proposals", label: "pending to answer" },
    { title: "Bookings", count: counts.bookings, to: "/bookings", label: "requests waiting" },
    { title: "Project applications", count: counts.applications, to: "/applications", label: "applicants to review" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Welcome back{me ? `, ${me.name}` : ""}</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/edit-profile">Edit profile</Link></Button>
          <Button asChild variant="outline"><Link to="/collab-hub">Collaboration hub</Link></Button>
          <Button asChild variant="outline"><Link to="/marketplace">List a service</Link></Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="pb-2"><CardTitle className="text-base">{t.title}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{t.count}</p>
                <p className="text-sm text-muted-foreground">{t.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Your availability</h2>
        {me && <AvailabilityCalendar profileId={me.id} profileName={me.name} currentUserId={me.id} isOwner />}
      </section>
    </div>
  );
}
