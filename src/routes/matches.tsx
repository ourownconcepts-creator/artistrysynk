import { createFileRoute, redirect } from "@tanstack/react-router";
import { buildPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/matches")({
  head: () =>
    buildPageHead({
      path: "/matches",
      title: "Your matches | ArtistrySynk",
      description: "Creatives you have matched with on ArtistrySynk.",
      noIndex: true,
    }),
  beforeLoad: () => {
    throw redirect({ to: "/messages", replace: true });
  },
});
