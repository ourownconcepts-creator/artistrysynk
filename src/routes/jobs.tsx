import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Jobs from "@/pages/Jobs";
import { buildPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/jobs")({
  head: () =>
    buildPageHead({
      path: "/jobs",
      title: "Creative jobs board | ArtistrySynk",
      description: "Browse and post paid creative roles and gigs.",
    }),
  component: () => (
    <>
      <Navbar />
      <PageTransition>
        <Jobs />
      </PageTransition>
    </>
  ),
});