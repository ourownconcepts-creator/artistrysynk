import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, HeartOff, Users, TrendingUp, Percent, RotateCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";

interface SwipeStats {
  totalSwipes: number;
  likes: number;
  dislikes: number;
  likeRate: number;
  matchRate: number;
  totalMatches: number;
  rewinds: number;
}

interface DailySwipes {
  date: string;
  likes: number;
  dislikes: number;
}

export const SwipeAnalytics = () => {
  const [stats, setStats] = useState<SwipeStats>({
    totalSwipes: 0,
    likes: 0,
    dislikes: 0,
    likeRate: 0,
    matchRate: 0,
    totalMatches: 0,
    rewinds: 0,
  });
  const [dailyData, setDailyData] = useState<DailySwipes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSwipeAnalytics();
  }, []);

  const fetchSwipeAnalytics = async () => {
    setLoading(true);

    // Fetch all swipes
    const { data: swipes, error: swipesError } = await supabase
      .from("swipes")
      .select("liked, created_at");

    // Fetch all matches
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id");

    // Fetch rewinds
    const { data: rewinds, error: rewindsError } = await supabase
      .from("swipe_rewinds")
      .select("id");

    if (swipesError || matchesError) {
      console.error("Error fetching analytics:", swipesError || matchesError);
      setLoading(false);
      return;
    }

    const totalSwipes = swipes?.length || 0;
    const likes = swipes?.filter(s => s.liked).length || 0;
    const dislikes = totalSwipes - likes;
    const totalMatches = matches?.length || 0;
    const totalRewinds = rewinds?.length || 0;

    setStats({
      totalSwipes,
      likes,
      dislikes,
      likeRate: totalSwipes > 0 ? (likes / totalSwipes) * 100 : 0,
      matchRate: likes > 0 ? (totalMatches / likes) * 100 : 0,
      totalMatches,
      rewinds: totalRewinds,
    });

    // Process daily data for last 14 days
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      return format(date, "yyyy-MM-dd");
    });

    const dailySwipes = last14Days.map(date => {
      const daySwipes = swipes?.filter(s => 
        s.created_at && format(new Date(s.created_at), "yyyy-MM-dd") === date
      ) || [];
      
      return {
        date: format(new Date(date), "MMM dd"),
        likes: daySwipes.filter(s => s.liked).length,
        dislikes: daySwipes.filter(s => !s.liked).length,
      };
    });

    setDailyData(dailySwipes);
    setLoading(false);
  };

  const pieData = [
    { name: "Likes", value: stats.likes, color: "hsl(var(--primary))" },
    { name: "Dislikes", value: stats.dislikes, color: "hsl(var(--muted))" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Swipe Analytics
        </CardTitle>
        <CardDescription>Insights into user swiping behavior and match patterns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-muted-foreground">Loading analytics...</p>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total Swipes</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalSwipes.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">Likes</span>
                  </div>
                  <p className="text-2xl font-bold text-red-500">{stats.likes.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <HeartOff className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-muted-foreground">Dislikes</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-500">{stats.dislikes.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Like Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-500">{stats.likeRate.toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Match Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-green-500">{stats.matchRate.toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                    <span className="text-sm text-muted-foreground">Matches</span>
                  </div>
                  <p className="text-2xl font-bold text-pink-500">{stats.totalMatches.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-muted-foreground">Rewinds</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-500">{stats.rewinds.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Daily Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Daily Swipe Activity (Last 14 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="likes" name="Likes" fill="hsl(var(--primary))" />
                      <Bar dataKey="dislikes" name="Dislikes" fill="hsl(var(--muted))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Like/Dislike Ratio */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Like vs Dislike Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
