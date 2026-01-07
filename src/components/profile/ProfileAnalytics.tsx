import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Users, Heart, TrendingUp } from "lucide-react";

interface AnalyticsData {
  portfolioCount: number;
  matchCount: number;
  swipeCount: number;
  likeCount: number;
}

interface ProfileAnalyticsProps {
  userId: string;
}

export const ProfileAnalytics = ({ userId }: ProfileAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    portfolioCount: 0,
    matchCount: 0,
    swipeCount: 0,
    likeCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Get portfolio items count
      const { count: portfolioCount } = await supabase
        .from('portfolio_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get matches count
      const { count: matchCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

      // Get swipes on this user (views)
      const { count: swipeCount } = await supabase
        .from('swipes')
        .select('*', { count: 'exact', head: true })
        .eq('swiped_id', userId);

      // Get likes on this user
      const { count: likeCount } = await supabase
        .from('swipes')
        .select('*', { count: 'exact', head: true })
        .eq('swiped_id', userId)
        .eq('liked', true);

      setAnalytics({
        portfolioCount: portfolioCount || 0,
        matchCount: matchCount || 0,
        swipeCount: swipeCount || 0,
        likeCount: likeCount || 0,
      });
      setLoading(false);
    };

    fetchAnalytics();
  }, [userId]);

  const stats = [
    {
      title: "Portfolio Items",
      value: analytics.portfolioCount,
      icon: Eye,
      description: "Creative works uploaded",
      color: "text-blue-500",
    },
    {
      title: "Profile Views",
      value: analytics.swipeCount,
      icon: Users,
      description: "Times your profile was viewed",
      color: "text-green-500",
    },
    {
      title: "Likes Received",
      value: analytics.likeCount,
      icon: Heart,
      description: "People who liked your profile",
      color: "text-pink-500",
    },
    {
      title: "Total Matches",
      value: analytics.matchCount,
      icon: TrendingUp,
      description: "Successful connections made",
      color: "text-purple-500",
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading analytics...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Profile Analytics
        </CardTitle>
        <CardDescription>Track your profile performance and engagement</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="p-4 rounded-lg border bg-muted/30 text-center"
            >
              <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm font-medium">{stat.title}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
