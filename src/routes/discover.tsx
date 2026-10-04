import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Discover from "@/pages/Discover";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";
import { SeoCopyBlock } from "@/components/seo/SeoCopyBlock";
import { discoverCopy } from "@/content/seoCopy";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/discover")({
  head: () =>
    buildPageHead({
      path: "/discover",
      title: "Discover Creatives to Collaborate With | ArtistrySynk",
      description:
        "Swipe through musicians, music producers, rappers, photographers, videographers, designers and dancers matched to your roles, genres and location. Match, message and collaborate.",
      keywords: "find music producers, find collaborators, creative networking app, swipe to collaborate, find photographers",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Discover", path: "/discover" }])],
    }),
  component: DiscoverGate,
});

/** Signed-in members get the swipe deck; visitors and crawlers see an explainer. */
function DiscoverGate() {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState(data.session ? "in" : "out"));
  }, []);
  if (state === "in") return <Discover />;
  return (
    <main className="min-h-dvh bg-background pt-10">
      <h1 className="container mx-auto max-w-4xl px-4 text-3xl font-bold tracking-tight md:text-5xl">
        Discover creative collaborators near you and worldwide
      </h1>
      <SeoCopyBlock copy={discoverCopy} />
      <Footer />
    </main>
  );
}
