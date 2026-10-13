import { createFileRoute, redirect } from "@tanstack/react-router";

// The 2026 season is the current edition; keep the seasonal URL working.
export const Route = createFileRoute("/creative-talent-hunt/2026")({
  beforeLoad: () => {
    throw redirect({ to: "/creative-talent-hunt" });
  },
});
