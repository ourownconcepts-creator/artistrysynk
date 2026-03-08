import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight } from "lucide-react";
import { getRoleLabel } from "@/lib/creativeRoles";

interface NearbyCreator {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  location: string;
  city: string;
  country: string;
  roles: string[];
}

export const CreatorsNearYou = ({ currentUserId }: { currentUserId: string }) => {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<NearbyCreator[]>([]);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  useEffect(() => {
    loadNearbyCreators();
  }, [currentUserId]);

  const loadNearbyCreators = async () => {
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("location, city, country")
      .eq("id", currentUserId)
      .single();

    if (!myProfile) return;

    const loc = (myProfile as any).city || (myProfile as any).country || myProfile.location;
    if (!loc) return;
    setUserLocation(loc);

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, location, city, country")
      .neq("id", currentUserId)
      .or(`city.ilike.%${loc}%,country.ilike.%${loc}%,location.ilike.%${loc}%`)
      .limit(6);

    if (!data || data.length === 0) return;

    const userIds = data.map(d => d.id);
    const { data: rolesData } = await supabase
      .from("user_creative_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const roleMap: Record<string, string[]> = {};
    (rolesData || []).forEach(r => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    setCreators(data.map(d => ({
      ...d,
      city: (d as any).city || "",
      country: (d as any).country || "",
      roles: roleMap[d.id] || [],
    })));
  };

  if (creators.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Creators Near You</h3>
          {userLocation && <Badge variant="outline" className="text-xs">{userLocation}</Badge>}
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {creators.map(creator => (
          <Card
            key={creator.id}
            className="shrink-0 w-36 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/profile/${creator.id}`)}
          >
            <CardContent className="p-3 text-center">
              <Avatar className="w-12 h-12 mx-auto mb-2">
                <AvatarImage src={creator.avatar_url} />
                <AvatarFallback>{creator.full_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="text-xs font-medium truncate">{creator.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">@{creator.username}</p>
              {creator.roles[0] && (
                <Badge variant="secondary" className="text-xs mt-1 truncate max-w-full">
                  {getRoleLabel(creator.roles[0])}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
