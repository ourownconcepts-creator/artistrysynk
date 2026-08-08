import { PUBLIC_ORIGIN } from "@/lib/native";
import { openExternalUrl } from "@/lib/nativeMedia";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Share2, Copy, Gift, Star, Crown, Sparkles } from "lucide-react";

const REWARD_TIERS = [
  { count: 3, label: "Featured Boost", icon: Star, color: "text-yellow-500" },
  { count: 10, label: "Verified Badge", icon: Crown, color: "text-emerald-500" },
  { count: 25, label: "Homepage Feature", icon: Sparkles, color: "text-purple-500" },
  { count: 50, label: "Platform Spotlight", icon: Gift, color: "text-primary" },
];

export const ReferralCard = () => {
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get or create referral code
    const { data: existing } = await supabase
      .from("referrals")
      .select("referral_code")
      .eq("referrer_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      setReferralCode(existing[0].referral_code);
    } else {
      // Generate unique code from username or random
      const code = `ASK-${user.id.slice(0, 8).toUpperCase()}`;
      await supabase.from("referrals").insert({
        referrer_id: user.id,
        referral_code: code,
        status: "active",
      });
      setReferralCode(code);
    }

    // Count completed referrals
    const { count } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", user.id)
      .eq("status", "completed");

    setReferralCount(count || 0);
    setLoading(false);
  };

  const referralLink = `${PUBLIC_ORIGIN}/auth?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const shareVia = (platform: string) => {
    const text = encodeURIComponent("Join me on ArtistrySynk — the creative collaboration platform! 🎨🎵");
    const url = encodeURIComponent(referralLink);
    const links: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      instagram: referralLink,
      email: `mailto:?subject=${encodeURIComponent("Join ArtistrySynk!")}&body=${text}%20${url}`,
    };

    if (platform === "instagram") {
      navigator.clipboard.writeText(referralLink);
      toast.success("Link copied! Paste it in your Instagram bio or story.");
      return;
    }

    void openExternalUrl(links[platform]);
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Refer & Earn
        </CardTitle>
        <CardDescription>
          Invite creators and unlock exclusive rewards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Link */}
        <div className="flex gap-2">
          <Input value={referralLink} readOnly className="text-sm" />
          <Button variant="outline" size="icon" onClick={copyLink}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => shareVia("whatsapp")} className="gap-1">
            WhatsApp
          </Button>
          <Button size="sm" variant="outline" onClick={() => shareVia("twitter")} className="gap-1">
            X / Twitter
          </Button>
          <Button size="sm" variant="outline" onClick={() => shareVia("instagram")} className="gap-1">
            Instagram
          </Button>
          <Button size="sm" variant="outline" onClick={() => shareVia("email")} className="gap-1">
            Email
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {referralCount} successful referral{referralCount !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {REWARD_TIERS.map((tier) => {
              const Icon = tier.icon;
              const achieved = referralCount >= tier.count;
              return (
                <div
                  key={tier.count}
                  className={`flex items-center gap-3 p-2 rounded-lg ${achieved ? "bg-primary/10" : "bg-muted/50"}`}
                >
                  <Icon className={`w-5 h-5 ${achieved ? tier.color : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${achieved ? "" : "text-muted-foreground"}`}>
                      {tier.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tier.count} referrals
                    </p>
                  </div>
                  {achieved ? (
                    <Badge variant="default" className="text-xs">Unlocked</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {tier.count - referralCount} more
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
