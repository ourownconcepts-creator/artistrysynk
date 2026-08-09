import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import PrivacyRequests from "@/pages/PrivacyRequests";

const TITLE = "Submit a data request | ArtistrySynk";
const DESCRIPTION =
  "Ask ArtistrySynk to access, correct, export, restrict or delete your personal data and track your request with a reference number.";

export const Route = createFileRoute("/privacy-requests")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PageTransition>
      <PrivacyRequests />
    </PageTransition>
  ),
});
