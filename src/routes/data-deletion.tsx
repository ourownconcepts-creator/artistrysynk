import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import DataDeletion from "@/pages/DataDeletion";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/data-deletion")({
  head: () =>
    buildPageHead({
      path: "/data-deletion",
      title: "Delete Your Account & Data | ArtistrySynk",
      description: "Request deletion of your ArtistrySynk account and personal data, in-app or by email. Learn what is deleted, what is retained and how long it takes.",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Account & Data Deletion", path: "/data-deletion" }])],
    }),
  component: () => (
    <PageTransition>
      <DataDeletion />
    </PageTransition>
  ),
});