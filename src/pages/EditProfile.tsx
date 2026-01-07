import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Upload, Link, Instagram, Twitter, Youtube, Music, Mic, Users, Film, Palette } from "lucide-react";

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
  { value: 'screenwriter', label: 'Screenwriter', icon: Film },
  { value: 'promoter', label: 'Promoter', icon: Users },
  { value: 'manager', label: 'Manager', icon: Users },
  { value: 'strategist', label: 'Strategist', icon: Users },
];

const genres = [
  { value: 'afrobeats', label: 'Afrobeats' },
  { value: 'hip_hop', label: 'Hip Hop' },
  { value: 'rnb', label: 'R&B' },
  { value: 'gospel', label: 'Gospel' },
  { value: 'pop', label: 'Pop' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'dancehall', label: 'Dancehall' },
  { value: 'amapiano', label: 'Amapiano' },
  { value: 'highlife', label: 'Highlife' },
  { value: 'fuji', label: 'Fuji' },
  { value: 'juju', label: 'Juju' },
  { value: 'other', label: 'Other' },
];

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    instagram: "",
    twitter: "",
    youtube: "",
    website: "",
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
        loadProfile(user.id);
      }
    });
  }, [navigate]);

  const loadProfile = async (uid: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (profile) {
      setFullName(profile.full_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setAvatarUrl(profile.avatar_url || "");
      setCoverImageUrl(profile.cover_image_url || "");
      const links = profile.social_links as any;
      if (links) {
        setSocialLinks({
          instagram: links.instagram || "",
          twitter: links.twitter || "",
          youtube: links.youtube || "",
          website: links.website || "",
        });
      }
    }

    const { data: roles } = await supabase
      .from('user_creative_roles')
      .select('role')
      .eq('user_id', uid);

    if (roles) {
      setSelectedRoles(roles.map(r => r.role));
    }

    const { data: genresData } = await supabase
      .from('user_genres')
      .select('genre')
      .eq('user_id', uid);

    if (genresData) {
      setSelectedGenres(genresData.map(g => g.genre));
    }
  };

  const handleImageUpload = async (file: File, type: 'avatar' | 'cover') => {
    if (!userId) return;
    
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${type}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('portfolios')
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Failed to upload image');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('portfolios')
      .getPublicUrl(filePath);

    if (type === 'avatar') {
      setAvatarUrl(publicUrl);
    } else {
      setCoverImageUrl(publicUrl);
    }
    
    setUploading(false);
    toast.success('Image uploaded');
  };

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
    if (!userId) return;
    
    if (selectedRoles.length === 0) {
      toast.error("Please select at least one creative role");
      return;
    }

    setLoading(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username,
          bio,
          location,
          avatar_url: avatarUrl,
          cover_image_url: coverImageUrl,
          social_links: socialLinks,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Delete existing roles and insert new ones
      await supabase.from('user_creative_roles').delete().eq('user_id', userId);
      
      if (selectedRoles.length > 0) {
        const roleInserts = selectedRoles.map(role => ({
          user_id: userId,
          role: role as any,
        }));
        await supabase.from('user_creative_roles').insert(roleInserts);
      }

      // Delete existing genres and insert new ones
      await supabase.from('user_genres').delete().eq('user_id', userId);
      
      if (selectedGenres.length > 0) {
        const genreInserts = selectedGenres.map(genre => ({
          user_id: userId,
          genre: genre as any,
        }));
        await supabase.from('user_genres').insert(genreInserts);
      }

      toast.success("Profile updated successfully!");
      navigate("/profile");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your profile information and creative details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Cover Image */}
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div 
                  className="relative h-40 rounded-lg bg-muted overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => document.getElementById('cover-upload')?.click()}
                >
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
                    disabled={uploading}
                  />
                </div>
              </div>

              {/* Avatar */}
              <div className="space-y-2">
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <Avatar 
                    className="w-24 h-24 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-2xl">
                      {fullName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={uploading}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'avatar')}
                    disabled={uploading}
                  />
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Lagos, Nigeria"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
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

              {/* Creative Roles */}
              <div className="space-y-2">
                <Label>Creative Roles (Select at least 1)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
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

              {/* Genres */}
              <div className="space-y-2">
                <Label>Genres (Optional)</Label>
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

              {/* Social Links */}
              <div className="space-y-4">
                <Label>Social Links</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Instagram username"
                      value={socialLinks.instagram}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Twitter className="w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Twitter/X handle"
                      value={socialLinks.twitter}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="YouTube channel"
                      value={socialLinks.youtube}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, youtube: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Link className="w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Website URL"
                      value={socialLinks.website}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate("/profile")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditProfile;
