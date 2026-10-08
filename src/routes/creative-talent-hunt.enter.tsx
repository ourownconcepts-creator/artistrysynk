import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import { CREATIVE_TALENT_HUNT_CATEGORIES } from "@/features/competitions/creativeTalentHunt";
import {
  ensureCreativeTalentHuntApplication,
  getCreativeTalentHuntApplication,
  updateCreativeTalentHuntApplication,
  type TalentHuntApplication,
} from "@/features/competitions/creativeTalentHunt.service";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/creative-talent-hunt/enter")({
  head: () => ({
    meta: [
      { title: "Enter the Creative Talent Hunt — ArtistrySynk" },
      {
        name: "description",
        content:
          "Enter the ArtistrySynk Creative Talent Hunt and turn your talent into an opportunity.",
      },
    ],
  }),
  component: EntryPage,
});

function EntryPage() {
  const navigate = useNavigate();
  const [application, setApplication] = useState<TalentHuntApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [form, setForm] = useState({
    display_name: "",
    handle: "",
    location: "",
    bio: "",
    experience: "",
    audition_url: "",
    audition_notes: "",
  });

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const next = "/creative-talent-hunt/enter";
        await navigate({ to: "/auth/", search: { next } as never });
        return;
      }

      const existing = await getCreativeTalentHuntApplication(data.session.user.id);
      if (!mounted) return;

      const categoryFromUrl =
        new URLSearchParams(window.location.search).get("category") || "";

      if (existing) {
        setApplication(existing);
        setForm({
          display_name: existing.display_name,
          handle: existing.handle,
          location: existing.location,
          bio: existing.bio,
          experience: existing.experience,
          audition_url: existing.audition_url,
          audition_notes: existing.audition_notes,
        });
        setSelectedCategory(
          CREATIVE_TALENT_HUNT_CATEGORIES.find(
            (category) => category.toLowerCase() === categoryFromUrl,
          )
            ? categoryFromUrl
            : "",
        );
      } else if (categoryFromUrl) {
        try {
          const created = await ensureCreativeTalentHuntApplication(
            data.session.user.id,
            categoryFromUrl,
          );
          if (!mounted) return;
          setApplication(created);
          setSelectedCategory(categoryFromUrl);
          setForm({
            display_name: created.display_name,
            handle: created.handle,
            location: created.location,
            bio: created.bio,
            experience: created.experience,
            audition_url: created.audition_url,
            audition_notes: created.audition_notes,
          });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not start your entry.");
        }
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const chooseCategory = async (category: (typeof CREATIVE_TALENT_HUNT_CATEGORIES)[number]) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      await navigate({
        to: "/auth/",
        search: { next: `/creative-talent-hunt/enter?category=${categoryToSlug(category)}` } as never,
      });
      return;
    }

    setLoading(true);
    try {
      const created = await ensureCreativeTalentHuntApplication(
        data.session.user.id,
        categoryToSlug(category),
      );
      setApplication(created);
      setSelectedCategory(categoryToSlug(category));
      setForm({
        display_name: created.display_name,
        handle: created.handle,
        location: created.location,
        bio: created.bio,
        experience: created.experience,
        audition_url: created.audition_url,
        audition_notes: created.audition_notes,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start your entry.");
    } finally {
      setLoading(false);
    }
  };

  const saveApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!application) return;

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      await navigate({ to: "/auth/", search: { next: "/creative-talent-hunt/enter" } as never });
      return;
    }

    setSaving(true);
    try {
      const updated = await updateCreativeTalentHuntApplication(
        application.id,
        data.session.user.id,
        form,
      );
      setApplication(updated);
      toast.success("Your Talent Hunt entry has been saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your entry.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-background text-foreground">
          <div className="mx-auto max-w-3xl px-6 py-24 text-center text-muted-foreground">
            Preparing your Talent Hunt entry…
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
          <Link
            to="/creative-talent-hunt"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to Creative Talent Hunt
          </Link>

          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              ArtistrySynk Creative Talent Hunt
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              {application ? "Build your entry." : "Choose your creative lane."}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Your Talent Hunt entry is connected to your ArtistrySynk identity. One account,
              one creative profile, more opportunities.
            </p>
          </div>

          {!application ? (
            <div className="mt-10 rounded-3xl border p-6 sm:p-8">
              <div className="grid gap-3 sm:grid-cols-2">
                {CREATIVE_TALENT_HUNT_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => void chooseCategory(category)}
                    className="rounded-2xl border px-5 py-4 text-left font-medium transition hover:bg-muted"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={saveApplication} className="mt-10 space-y-6 rounded-3xl border p-6 sm:p-8">
              <div className="rounded-2xl bg-muted/50 p-5 text-sm">
                <span className="font-semibold">Category:</span>{" "}
                {CREATIVE_TALENT_HUNT_CATEGORIES.find(
                  (category) => categoryToSlug(category) === selectedCategory,
                ) || "Creative Talent"}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Creator name</Label>
                  <Input
                    id="display_name"
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    placeholder="How people should know you"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="handle">ArtistrySynk handle</Label>
                  <Input
                    id="handle"
                    value={form.handle}
                    onChange={(e) => setForm({ ...form, handle: e.target.value })}
                    placeholder="yourhandle"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Tell us about your creative work</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="What do you create? What makes your work different?"
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Textarea
                  id="experience"
                  value={form.experience}
                  onChange={(e) => setForm({ ...form, experience: e.target.value })}
                  placeholder="Previous work, performances, releases, projects, clients or milestones."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audition_url">Audition / portfolio link</Label>
                <Input
                  id="audition_url"
                  type="url"
                  value={form.audition_url}
                  onChange={(e) => setForm({ ...form, audition_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audition_notes">What should the judges notice?</Label>
                <Textarea
                  id="audition_notes"
                  value={form.audition_notes}
                  onChange={(e) => setForm({ ...form, audition_notes: e.target.value })}
                  placeholder="Give the judges context about your submission."
                  rows={4}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save my entry"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void navigate({ to: "/talent" })}>
                  Preview talent discovery
                </Button>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                Saving your entry does not publish it. Public discovery happens only after you
                opt in and the competition workflow approves the entry.
              </p>
            </form>
          )}
        </section>
      </main>
    </PageTransition>
  );
}

function categoryToSlug(category: string) {
  return category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
