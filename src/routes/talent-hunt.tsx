import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/talent-hunt")({
  beforeLoad: () => {
    throw redirect({ to: "/creative-talent-hunt" });
  },
});
