import { createFileRoute } from "@tanstack/react-router";
import IntegrationClaim from "@/pages/IntegrationClaim";

export const Route = createFileRoute("/integration/v1/claim")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Connect Identity | ArtistrySynk" },
    { name: "description", content: "Securely connect an ArtistrySynk creative identity to an approved application." },
    { property: "og:title", content: "Connect Identity | ArtistrySynk" },
    { property: "og:description", content: "Securely connect an ArtistrySynk creative identity to an approved application." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: IntegrationClaim,
});