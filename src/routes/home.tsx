import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Your Home Feed | ArtistrySynk" },
      {
        name: "description",
        content:
          "Your ArtistrySynk home: matches online now, nearby creatives, trending collaborations and recommended opportunities.",
      },
      { property: "og:title", content: "Your Home Feed | ArtistrySynk" },
      {
        property: "og:description",
        content: "Matches, nearby creatives, trending collaborations and opportunities in one live feed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Home,
});