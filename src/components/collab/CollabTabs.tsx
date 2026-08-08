import { useRouter, useRouterState } from "@tanstack/react-router";
import { Sparkles, Briefcase, FolderKanban } from "lucide-react";
import { SegmentedControl } from "@/components/native-ui";

const TABS = [
  { key: "/feed", label: "Feed", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { key: "/open-projects", label: "Open roles", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: "/projects", label: "My projects", icon: <FolderKanban className="h-3.5 w-3.5" /> },
];

/** Sticky segmented navigation shared by the collaboration surfaces. */
export function CollabTabs() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const value = TABS.find((t) => pathname.startsWith(t.key))?.key ?? "/feed";

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-3 px-4 pb-2 pt-1">
      <SegmentedControl
        ariaLabel="Collaboration views"
        layoutId="collab-tabs"
        segments={TABS}
        value={value}
        onChange={(key) => router.navigate({ to: key })}
      />
    </div>
  );
}
