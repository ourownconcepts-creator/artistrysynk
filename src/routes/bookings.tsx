import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import { buildPageHead } from "@/lib/seoHead";
import { ProposalsPage } from "./proposals";

export const Route = createFileRoute("/bookings")({
  head: () =>
    buildPageHead({
      path: "/bookings",
      title: "Bookings | ArtistrySynk",
      description: "Booking requests you've sent and received on ArtistrySynk.",
      noIndex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Bookings">
        <ProposalsPage initialTab="bookings" />
      </AppShell>
    </ProtectedRoute>
  ),
});
