import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MapPin, Search, Filter, Loader2 } from "lucide-react";
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
  distance_km: number;
  roles: string[];
}

const LocationDiscovery = () => {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState(100);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
        initLocation(user.id);
      }
    });
  }, [navigate]);

  const initLocation = async (uid: string) => {
    // Check saved coordinates
    const { data: profile } = await supabase
      .from("profiles")
      .select("latitude, longitude")
      .eq("id", uid)
      .single();

    let lat = (profile as any)?.latitude;
    let lng = (profile as any)?.longitude;

    if (!lat || !lng) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 8000,
            enableHighAccuracy: false,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;

        // Save for future
        await supabase
          .from("profiles")
          .update({ latitude: lat, longitude: lng } as any)
          .eq("id", uid);
      } catch {
        // No geolocation, load text-based fallback
        loadFallback(uid);
        return;
      }
    }

    setUserCoords({ lat, lng });
    loadByProximity(uid, lat, lng, radius);
  };

  const loadByProximity = async (uid: string, lat: number, lng: number, radiusKm: number) => {
    setLoading(true);

    const { data, error } = await supabase.rpc("get_nearby_creators", {
      _user_id: uid,
      _lat: lat,
      _lng: lng,
      _radius_km: radiusKm,
      _limit: 50,
    });

    if (error || !data || data.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }

    const userIds = data.map((d: any) => d.id);
    const { data: rolesData } = await supabase
      .from("user_creative_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const roleMap: Record<string, string[]> = {};
    (rolesData || []).forEach((r) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    let results: Creator[] = data.map((d: any) => ({
      ...d,
      roles: roleMap[d.id] || [],
    }));

    if (roleFilter) {
      results = results.filter((c) => c.roles.includes(roleFilter));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(q) ||
          c.username?.toLowerCase().includes(q)
      );
    }

    setCreators(results);
    setLoading(false);
  };

  const loadFallback = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, location, city, country, bio, is_verified")
      .not("location", "is", null)
      .neq("id", uid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) {
      setLoading(false);
      return;
    }

    const userIds = data.map((d) => d.id);
    const { data: rolesData } = userIds.length > 0
      ? await supabase.from("user_creative_roles").select("user_id, role").in("user_id", userIds)
      : { data: [] };

    const roleMap: Record<string, string[]> = {};
    (rolesData || []).forEach((r) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    setCreators(
      data.map((d) => ({
        ...d,
        city: d.city || "",
        country: d.country || "",
        distance_km: 0,
        roles: roleMap[d.id] || [],
      }))
    );
    setLoading(false);
  };

  const applyFilters = () => {
    if (userCoords && userId) {
      loadByProximity(userId, userCoords.lat, userCoords.lng, radius);
    }
  };

  const clearFilters = () => {
    setRoleFilter("");
    setSearchQuery("");
    setRadius(100);
    if (userCoords && userId) {
      loadByProximity(userId, userCoords.lat, userCoords.lng, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-5xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
            <MapPin className="w-8 h-8 text-primary" />
            Creators Near You
          </h1>
          <p className="text-muted-foreground">Discover creators by proximity to your location</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roleCategories.flatMap((c) => c.roles).slice(0, 30).map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Radius: {radius} km
                </label>
                <Slider
                  value={[radius]}
                  onValueChange={([v]) => setRadius(v)}
                  min={10}
                  max={500}
                  step={10}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyFilters} size="sm">
                <Filter className="w-4 h-4 mr-1" /> Apply
              </Button>
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear
              </Button>
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
              <h2 className="text-xl font-semibold mb-2">No creators found nearby</h2>
              <p className="text-muted-foreground">
                Try increasing the radius or enable location permissions in your browser
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators.map((creator) => (
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
                        {creator.distance_km > 0
                          ? `${Math.round(creator.distance_km)} km away`
                          : creator.city && creator.country
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
                      {creator.roles.slice(0, 3).map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {getRoleLabel(role)}
                        </Badge>
                      ))}
                      {creator.roles.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{creator.roles.length - 3}
                        </Badge>
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
