import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Music, User, Film, Camera, Palette } from "lucide-react";

interface RoleStats {
  role: string;
  count: number;
  percentage: number;
}

interface GenreStats {
  genre: string;
  count: number;
}

interface UserWithRoles {
  id: string;
  full_name: string;
  username: string;
  roles: string[];
  genres: string[];
  portfolioCount: number;
  is_verified: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];

export const CreativeRoleAnalytics = () => {
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [genreStats, setGenreStats] = useState<GenreStats[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Get role statistics
    const { data: rolesData } = await supabase
      .from('user_creative_roles')
      .select('role');

    if (rolesData) {
      const roleCounts: Record<string, number> = {};
      rolesData.forEach(r => {
        roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
      });
      const total = rolesData.length;
      setRoleStats(Object.entries(roleCounts).map(([role, count]) => ({
        role,
        count,
        percentage: Math.round((count / total) * 100)
      })).sort((a, b) => b.count - a.count));
    }

    // Get genre statistics
    const { data: genresData } = await supabase
      .from('user_genres')
      .select('genre');

    if (genresData) {
      const genreCounts: Record<string, number> = {};
      genresData.forEach(g => {
        genreCounts[g.genre] = (genreCounts[g.genre] || 0) + 1;
      });
      setGenreStats(Object.entries(genreCounts).map(([genre, count]) => ({
        genre,
        count
      })).sort((a, b) => b.count - a.count));
    }

    // Get users with their roles and portfolio counts
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, is_verified');

    if (profiles) {
      const usersWithDetails = await Promise.all(profiles.map(async (profile) => {
        const { data: userRoles } = await supabase
          .from('user_creative_roles')
          .select('role')
          .eq('user_id', profile.id);

        const { data: userGenres } = await supabase
          .from('user_genres')
          .select('genre')
          .eq('user_id', profile.id);

        const { count: portfolioCount } = await supabase
          .from('portfolio_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        return {
          id: profile.id,
          full_name: profile.full_name,
          username: profile.username,
          roles: userRoles?.map(r => r.role) || [],
          genres: userGenres?.map(g => g.genre) || [],
          portfolioCount: portfolioCount || 0,
          is_verified: profile.is_verified || false
        };
      }));

      setUsers(usersWithDetails);
    }

    setLoading(false);
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = selectedRole === "all" || user.roles.includes(selectedRole);
    const matchesGenre = selectedGenre === "all" || user.genres.includes(selectedGenre);
    return matchesRole && matchesGenre;
  });

  const getRoleIcon = (role: string) => {
    if (['musician', 'producer', 'songwriter'].includes(role)) return <Music className="w-4 h-4" />;
    if (['actor', 'director', 'screenwriter'].includes(role)) return <Film className="w-4 h-4" />;
    if (['photographer', 'videographer'].includes(role)) return <Camera className="w-4 h-4" />;
    if (['designer'].includes(role)) return <Palette className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading creative analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>Breakdown of creative roles on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="role"
                  label={({ role, percentage }) => `${role} (${percentage}%)`}
                >
                  {roleStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Genre Distribution</CardTitle>
            <CardDescription>Popular genres among creatives</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={genreStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="genre" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Creative Users Directory</CardTitle>
              <CardDescription>Filter and manage users by creative role and genre</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roleStats.map(r => (
                    <SelectItem key={r.role} value={r.role}>
                      {r.role.replace('_', ' ')} ({r.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genres</SelectItem>
                  {genreStats.map(g => (
                    <SelectItem key={g.genre} value={g.genre}>
                      {g.genre.replace('_', ' ')} ({g.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Genres</TableHead>
                <TableHead>Portfolio</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.slice(0, 20).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>@{user.username}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.slice(0, 3).map((role) => (
                        <Badge key={role} variant="outline" className="flex items-center gap-1">
                          {getRoleIcon(role)}
                          {role.replace('_', ' ')}
                        </Badge>
                      ))}
                      {user.roles.length > 3 && (
                        <Badge variant="secondary">+{user.roles.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.genres.slice(0, 2).map((genre) => (
                        <Badge key={genre} variant="secondary">
                          {genre.replace('_', ' ')}
                        </Badge>
                      ))}
                      {user.genres.length > 2 && (
                        <Badge variant="outline">+{user.genres.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.portfolioCount} items</TableCell>
                  <TableCell>
                    {user.is_verified ? (
                      <Badge className="bg-green-500">Verified</Badge>
                    ) : (
                      <Badge variant="outline">Unverified</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredUsers.length > 20 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Showing 20 of {filteredUsers.length} users
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
