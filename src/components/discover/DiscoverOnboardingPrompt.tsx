import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_COLUMNS } from "@/lib/profileColumns";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/native-ui";
import { CheckCircle2, Circle, Sparkles, X } from "lucide-react";

type Task = { id: string; label: string; done: boolean };

const DISMISS_KEY = "discover_onboarding_dismissed_v1";

/**
 * Short first-time prompt on /discover: nudges brand-new users to finish the
 * few missing profile basics, then get swiping. Hidden once dismissed or once
 * every basic is complete.
 */
export const DiscoverOnboardingPrompt = ({ userId }: { userId: string }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    if (typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY)) return;

    (async () => {
      const [profileRes, rolesRes, portfolioRes] = await Promise.all([
        supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle(),
        supabase.from("user_creative_roles").select("role").eq("user_id", userId).limit(1),
        supabase.from("portfolio_items").select("id").eq("user_id", userId).limit(1),
      ]);
      if (!active) return;

      const profile = profileRes.data as any;
      const next: Task[] = [
        { id: "avatar", label: "Add a profile photo", done: Boolean(profile?.avatar_url) },
        { id: "bio", label: "Write a short bio", done: (profile?.bio ?? "").trim().length >= 20 },
        { id: "roles", label: "Pick your creative roles", done: (rolesRes.data ?? []).length > 0 },
        { id: "location", label: "Set your location", done: Boolean(profile?.city || profile?.location) },
        { id: "portfolio", label: "Upload one portfolio item", done: (portfolioRes.data ?? []).length > 0 },
      ];
      setTasks(next);
      setVisible(next.some((t) => !t.done));
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible || !tasks) return null;

  const remaining = tasks.filter((t) => !t.done);

  return (
    <Surface className="relative mb-3 p-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss onboarding prompt"
        className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-surface-3 text-muted-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2 pr-8">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Finish your profile to get better matches</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {remaining.length} quick step{remaining.length === 1 ? "" : "s"} left — creatives with complete
        profiles get matched far more often.
      </p>

      <ul className="mt-3 space-y-1.5">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-2 text-xs">
            {task.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className={task.done ? "text-muted-foreground line-through" : ""}>{task.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate("/edit-profile")}>
          Complete profile
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Start swiping
        </Button>
      </div>
    </Surface>
  );
};
