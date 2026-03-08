import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, Users, Filter, Loader2 } from "lucide-react";
import { getRoleLabel, roleCategories } from "@/lib/creativeRoles";

interface Creator {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  location: string;
  city: string;
  country: string;
  bio: string;
  is_verified: boolean;
  roles: string[];
}

const LocationDiscovery = () => {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth");
      else loadCreators();
    });
  }, [navigate]);

  const loadCreators = async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, location, city, country, bio, is_verified")
      .not("location", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (cityFilter) query = query.ilike("city", `%${cityFilter}%`);
    if (countryFilter) query = query.ilike("country", `%${countryFilter}%`);
    if (searchQuery) query = query.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`);

    const { data } = await query;
    if (!data) { setLoading(false); return; }

    const userIds = data.map(d => d.id);
    const { data: rolesData } = userIds.length > 0
      ? await supabase.from("user_creative_roles").select("user_id, role").in("user_id", userIds)
      : { data: [] };

    const roleMap: Record<string, string[]> = {};
    (rolesData || []).forEach(r => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    let results: Creator[] = data.map(d => ({
      ...d,
      city: (d as any).city || "",
      country: (d as any).country || "",
      roles: roleMap[d.id] || [],
    }));

    if (roleFilter) {
      results = results.filter(c => c.roles.includes(roleFilter));
    }

    setCreators(results);
    setLoading(false);
  };

  const applyFilters = () => {
    loadCreators();
  };

  const clearFilters = () => {
    setCityFilter("");
    setCountryFilter("");
    setRoleFilter("");
    setSearchQuery("");
    loadCreators();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-5xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
            <MapPin className="w-8 h-8 text-primary" />
            Creators Near You
          </h1>
          <p className="text-muted-foreground">Discover creators by city, country, or region</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Input
                placeholder="City (e.g. Lagos)"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              />
              <Input
                placeholder="Country (e.g. Nigeria)"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All roles</SelectItem>
                  {roleCategories.flatMap(c => c.roles).slice(0, 30).map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={applyFilters} size="sm">
                <Filter className="w-4 h-4 mr-1" /> Apply
              </Button>
              <Button onClick={clearFilters} variant="outline" size="sm">Clear</Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : creators.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No creators found</h2>
              <p className="text-muted-foreground">Try adjusting your filters or location</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators.map(creator => (
              <Card
                key={creator.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                onClick={() => navigate(`/profile/${creator.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={creator.avatar_url} />
                      <AvatarFallback>{creator.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-sm truncate">{creator.full_name}</p>
                        {creator.is_verified && <span className="text-primary text-xs">✓</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">@{creator.username}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {creator.city && creator.country
                          ? `${creator.city}, ${creator.country}`
                          : creator.location || "Unknown"}
                      </div>
                    </div>
                  </div>
                  {creator.bio && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{creator.bio}</p>
                  )}
                  {creator.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {creator.roles.slice(0, 3).map(role => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {getRoleLabel(role)}
                        </Badge>
                      ))}
                      {creator.roles.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{creator.roles.length - 3}</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationDiscovery;
