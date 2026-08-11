import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Index from "@/pages/Index";
import { buildPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/")({
  head: () =>
    buildPageHead({
      path: "/",
      title: "ArtistrySynk \u2013 Create, Connect, Collaborate",
      description: "Connect with creatives worldwide \u2014 musicians, designers, photographers, filmmakers, dancers and writers. Match, collaborate and bring your vision to life.",
      keywords: "creative collaboration, artists, musicians, producers, dancers, actors, creative professionals, talent network",
    }),
  component: () => (
    <PageTransition>
      <Index />
    </PageTransition>
  ),
});