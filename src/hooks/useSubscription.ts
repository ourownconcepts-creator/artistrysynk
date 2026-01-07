import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "free" | "pro" | "studio";

interface Subscription {
  tier: SubscriptionTier;
  status: string;
  currentPeriodEnd: string | null;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading subscription:", error);
      }

      if (data) {
        setSubscription({
          tier: data.tier as SubscriptionTier,
          status: data.status,
          currentPeriodEnd: data.current_period_end,
        });
      } else {
        // Default to free tier
        setSubscription({
          tier: "free",
          status: "active",
          currentPeriodEnd: null,
        });
      }

      setLoading(false);
    };

    loadSubscription();

    // Listen for auth changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      loadSubscription();
    });

    return () => {
      authSub.unsubscribe();
    };
  }, []);

  const isPro = subscription?.tier === "pro" || subscription?.tier === "studio";
  const isStudio = subscription?.tier === "studio";

  const canSeeWhoLikedYou = isPro;
  const canRewindSwipes = isPro;
  const hasVerifiedBadge = isPro;
  const hasPriorityVisibility = isPro;
  const hasAdvancedAnalytics = isStudio;
  const hasTeamAccounts = isStudio;

  return {
    subscription,
    loading,
    isPro,
    isStudio,
    canSeeWhoLikedYou,
    canRewindSwipes,
    hasVerifiedBadge,
    hasPriorityVisibility,
    hasAdvancedAnalytics,
    hasTeamAccounts,
  };
};
