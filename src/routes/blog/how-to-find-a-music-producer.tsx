import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import HowToFindAMusicProducer from "@/pages/blog/HowToFindAMusicProducer";

export const Route = createFileRoute("/blog/how-to-find-a-music-producer")({
  component: () => (
    <PageTransition>
      <HowToFindAMusicProducer />
    </PageTransition>
  ),
});