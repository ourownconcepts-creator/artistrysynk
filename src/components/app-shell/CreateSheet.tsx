import { useNavigate } from "@tanstack/react-router";
import {
  Users,
  Megaphone,
  ImagePlus,
  Music4,
  Video,
  CalendarPlus,
  Radio,
  UsersRound,
  Sparkles,
} from "lucide-react";
import { BottomSheet, Pressable } from "@/components/native-ui";
import { toast } from "sonner";

type Action = {
  label: string;
  hint: string;
  icon: typeof Users;
  to?: string;
  search?: Record<string, string>;
  soon?: boolean;
};

const ACTIONS: Action[] = [
  { label: "Create Collaboration", hint: "Start a project room", icon: Users, to: "/projects", search: { create: "1" } },
  { label: "Post Opportunity", hint: "Hire or find talent", icon: Megaphone, to: "/jobs", search: { create: "1" } },
  { label: "Upload Portfolio", hint: "Show your best work", icon: ImagePlus, to: "/profile", search: { upload: "1" } },
  { label: "Upload Music", hint: "Tracks & beats", icon: Music4, to: "/profile", search: { upload: "audio" } },
  { label: "Upload Video", hint: "Reels & showreels", icon: Video, to: "/profile", search: { upload: "video" } },
  { label: "Upload Photos", hint: "Shoots & artwork", icon: ImagePlus, to: "/profile", search: { upload: "image" } },
  { label: "Create Event", hint: "Sessions & shows", icon: CalendarPlus, soon: true },
  { label: "Go Live", hint: "Broadcast to followers", icon: Radio, soon: true },
  { label: "Create Team", hint: "Build your crew", icon: UsersRound, to: "/teams" },
  { label: "Ask Synk AI", hint: "Ideas, captions, gigs", icon: Sparkles, to: "/synk-ai" },
];

export function CreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create"
      description="What are you making today?"
    >
      <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3">
        {ACTIONS.map(({ label, hint, icon: Icon, to, search, soon }) => (
          <Pressable
            key={label}
            lift
            aria-label={label}
            onClick={() => {
              onOpenChange(false);
              if (soon || !to) {
                toast("Coming soon", { description: `${label} is on the way.` });
                return;
              }
              navigate({ to, search: search ?? {} } as never);
            }}
            className="flex flex-col items-start gap-2 rounded-3xl bg-surface-2 p-4 text-left"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/12 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold leading-tight">{label}</span>
            <span className="text-[11px] text-muted-foreground">{soon ? "Coming soon" : hint}</span>
          </Pressable>
        ))}
      </div>
    </BottomSheet>
  );
}