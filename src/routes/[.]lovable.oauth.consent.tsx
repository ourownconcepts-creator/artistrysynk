import { createFileRoute } from "@tanstack/react-router";
import OAuthConsent from "@/pages/OAuthConsent";

function ConsentError() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <p>
        We couldn't open this connection request. Please return to the
        application and try again.
      </p>
    </main>
  );
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connect an App | ArtistrySynk" },
      {
        name: "description",
        content:
          "Review and approve secure access to your ArtistrySynk identity.",
      },
      { property: "og:title", content: "Connect an App | ArtistrySynk" },
      {
        property: "og:description",
        content:
          "Review and approve secure access to your ArtistrySynk identity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OAuthConsent,
  errorComponent: ConsentError,
});
