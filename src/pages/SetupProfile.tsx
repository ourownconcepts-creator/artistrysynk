import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Music, Mic, Users, Camera, Film, Palette } from "lucide-react";

const creativeRoles = [
  { value: 'musician', label: 'Musician', icon: Music },
  { value: 'producer', label: 'Producer', icon: Mic },
  { value: 'songwriter', label: 'Songwriter', icon: Music },
  { value: 'performer', label: 'Performer', icon: Users },
  { value: 'dancer', label: 'Dancer', icon: Users },
  { value: 'vixen', label: 'Vixen', icon: Camera },
  { value: 'actor', label: 'Actor', icon: Film },
  { value: 'director', label: 'Director', icon: Film },
  { value: 'photographer', label: 'Photographer', icon: Camera },
  { value: 'videographer', label: 'Videographer', icon: Camera },
  { value: 'designer', label: 'Designer', icon: Palette },
];

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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

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
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedRoles.length === 0) {
      toast.error("Please select at least one creative role");
      return;
    }

    setLoading(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ bio, location })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Insert roles
      const roleInserts = selectedRoles.map(role => ({
        user_id: userId,
        role: role as any,
      }));

      const { error: rolesError } = await supabase
        .from('user_creative_roles')
        .insert(roleInserts);

      if (rolesError) throw rolesError;

      // Insert genres
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
              <div className="space-y-2">
                <Label>Select Your Creative Roles (Choose at least 1)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {creativeRoles.map(role => {
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
