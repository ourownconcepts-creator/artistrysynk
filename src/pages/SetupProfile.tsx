import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { roleCategories, allRoles } from "@/lib/creativeRoles";

const genres = [
  { value: 'afrobeats', label: 'Afrobeats' },
  { value: 'hip_hop', label: 'Hip Hop' },
  { value: 'rnb', label: 'R&B' },
  { value: 'gospel', label: 'Gospel' },
  { value: 'pop', label: 'Pop' },
  { value: 'amapiano', label: 'Amapiano' },
  { value: 'highlife', label: 'Highlife' },
];

const SetupProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
      }
    });
  }, [navigate]);

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const toggleLookingFor = (role: string) => {
    setLookingFor(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedRoles.length === 0) {
      toast.error("Please select at least one role");
      return;
    }

    if (!userId) {
      toast.error("You must be signed in to set up your profile");
      return;
    }

    setLoading(true);

    try {
      // Try to get geolocation for proximity features
      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // Geolocation not available, skip
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ bio, location, looking_for: lookingFor, country, city, latitude, longitude } as any)
        .eq('id', userId);

      if (profileError) throw profileError;

      const roleInserts = selectedRoles.map(role => ({
        user_id: userId,
        role: role as any,
      }));

      const { error: rolesError } = await supabase
        .from('user_creative_roles')
        .insert(roleInserts);

      if (rolesError) throw rolesError;

      if (selectedGenres.length > 0) {
        const genreInserts = selectedGenres.map(genre => ({
          user_id: userId,
          genre: genre as any,
        }));

        const { error: genresError } = await supabase
          .from('user_genres')
          .insert(genreInserts);

        if (genresError) throw genresError;
      }

      toast.success("Profile setup complete!");
      navigate("/discover");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>Tell us about yourself and what you create</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* What best describes you? */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">What best describes you? (Select at least 1)</Label>
                {roleCategories.map((category) => (
                  <div key={category.label} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{category.label}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {category.roles.map(role => {
                        const Icon = role.icon;
                        return (
                          <Badge
                            key={role.value}
                            variant={selectedRoles.includes(role.value) ? "default" : "outline"}
                            className="cursor-pointer p-3 justify-center"
                            onClick={() => toggleRole(role.value)}
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            {role.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Looking For */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Who are you looking to collaborate with? (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {allRoles.slice(0, 30).map(role => (
                    <Badge
                      key={role.value}
                      variant={lookingFor.includes(role.value) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleLookingFor(role.value)}
                    >
                      {role.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Genres */}
              <div className="space-y-2">
                <Label>Select Your Genres (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {genres.map(genre => (
                    <Badge
                      key={genre.value}
                      variant={selectedGenres.includes(genre.value) ? "secondary" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleGenre(genre.value)}
                    >
                      {genre.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell the community about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="Lagos, Nigeria"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="Nigeria"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Lagos"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? "Setting up..." : "Complete Setup"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetupProfile;
