import { useState, useEffect } from "react";
import { useNavigate, Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, Edit, Shield, Instagram, Twitter, Youtube, Link as LinkIcon, ExternalLink, Image, Monitor, Settings, BarChart3, BadgeCheck, Award, Users as UsersIcon, Code, Github } from "lucide-react";
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid";
import { PortfolioUpload } from "@/components/portfolio/PortfolioUpload";
import { VerificationRequestButton } from "@/components/profile/VerificationRequestButton";

import { UserSessions } from "@/components/profile/UserSessions";
import { ProfileAnalytics } from "@/components/profile/ProfileAnalytics";
import { ProfileCompletionProgress } from "@/components/profile/ProfileCompletionProgress";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { MyAppeals } from "@/components/content/MyAppeals";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { getRoleLabel } from "@/lib/creativeRoles";

const Profile = () => {
  const navigate = useNavigate();
  useSessionTracking();
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [allRoles, setAllRoles] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
        loadProfile(user.id);
        loadUserRole(user.id);
        
      }
    });
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    setLoading(true);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: rolesData } = await supabase
      .from('user_creative_roles')
      .select('role')
      .eq('user_id', userId);

    const { data: genresData } = await supabase
      .from('user_genres')
      .select('genre')
      .eq('user_id', userId);

    setProfile(profileData);
    setRoles(rolesData || []);
    setGenres(genresData || []);
    setLoading(false);
  };


  const loadUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    // Get highest role
    const roles = data?.map(r => r.role) || ['user'];
    const priority = ['super_admin', 'master_admin', 'admin', 'user'];
    const highest = priority.find(p => roles.includes(p as any)) || 'user';
    setUserRole(highest);
    setAllRoles(roles);
  };

  const socialLinks = profile?.social_links as any;

  const getAdminLink = () => {
    switch (userRole) {
      case 'super_admin':
        return '/super-admin';
      case 'master_admin':
        return '/master-admin';
      case 'admin':
        return '/admin';
      default:
        return null;
    }
  };

  const getRoleBadgeColor = () => {
    switch (userRole) {
      case 'super_admin':
        return 'bg-destructive text-destructive-foreground';
      case 'master_admin':
        return 'bg-primary text-primary-foreground';
      case 'admin':
        return 'bg-secondary text-secondary-foreground';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Cover Image */}
      {profile?.cover_image_url && (
        <div className="h-40 md:h-56 w-full overflow-hidden rounded-3xl">
          <img 
            src={profile.cover_image_url} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="mx-auto max-w-4xl">

        <Card className={profile?.cover_image_url ? "-mt-16 relative z-10" : ""}>
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <Avatar className="w-28 h-28 border-4 border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-4xl">
                  {profile?.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-3xl flex items-center justify-center gap-2">
              {profile?.full_name}
              {profile?.is_verified && (
                <BadgeCheck className="w-6 h-6 text-emerald-500" />
              )}
            </CardTitle>
            <p className="text-muted-foreground">@{profile?.username}</p>
            
            {/* Verification Request */}
            {userId && (
              <div className="flex justify-center mt-2">
                <VerificationRequestButton 
                  userId={userId} 
                  isVerified={profile?.is_verified || false} 
                />
              </div>
            )}
            
            {/* Admin Badge & Links */}
            {allRoles.length > 0 && allRoles.some(r => r !== 'user') && (
              <div className="flex flex-col items-center gap-3 mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex flex-wrap gap-2 justify-center">
                  {allRoles.filter(r => r !== 'user').map(role => (
                    <Badge key={role} className={`gap-1 ${
                      role === 'super_admin' ? 'bg-destructive text-destructive-foreground' :
                      role === 'master_admin' ? 'bg-primary text-primary-foreground' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      <Shield className="w-3 h-3" />
                      {role.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  You have admin privileges
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {allRoles.includes('super_admin') && (
                    <Link to="/super-admin">
                      <Button variant="destructive" size="sm" className="gap-1">
                        <ExternalLink className="w-3 h-3" />
                        Super Admin
                      </Button>
                    </Link>
                  )}
                  {allRoles.includes('master_admin') && (
                    <Link to="/master-admin">
                      <Button variant="default" size="sm" className="gap-1">
                        <ExternalLink className="w-3 h-3" />
                        Master Admin
                      </Button>
                    </Link>
                  )}
                  {allRoles.includes('admin') && (
                    <Link to="/admin">
                      <Button variant="secondary" size="sm" className="gap-1">
                        <ExternalLink className="w-3 h-3" />
                        Admin Panel
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {profile?.location && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {profile.location}
              </div>
            )}

            {/* Social Links */}
            {socialLinks && Object.values(socialLinks).some(v => v) && (
              <div className="flex items-center justify-center gap-4">
                {socialLinks.instagram && (
                  <a 
                    href={`https://instagram.com/${socialLinks.instagram}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.twitter && (
                  <a 
                    href={`https://twitter.com/${socialLinks.twitter}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.youtube && (
                  <a 
                    href={`https://youtube.com/${socialLinks.youtube}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.website && (
                  <a 
                    href={socialLinks.website.startsWith('http') ? socialLinks.website : `https://${socialLinks.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}

            {roles.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-center">Creative Roles</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {roles.map((r, i) => (
                    <Badge key={i} variant="secondary">
                      {getRoleLabel(r.role)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Looking For */}
            {(profile as any)?.looking_for && (profile as any).looking_for.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-center flex items-center justify-center gap-1">
                  <UsersIcon className="w-4 h-4" /> Looking For
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {(profile as any).looking_for.map((r: string, i: number) => (
                    <Badge key={i} variant="outline">
                      {getRoleLabel(r)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {genres.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-center">Genres</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {genres.map((g, i) => (
                    <Badge key={i} variant="outline">
                      {g.genre.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile?.bio && (
              <div className="text-center">
                <h3 className="font-semibold mb-2">Bio</h3>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">{profile.bio}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              Joined {new Date(profile?.created_at).toLocaleDateString()}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/edit-profile")}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        {/* Profile Completion */}
        {userId && (
          <div className="mt-8">
            <ProfileCompletionProgress userId={userId} />
          </div>
        )}

        {/* Tabbed Content */}
        {userId && (
          <Tabs defaultValue="portfolio" className="mt-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="portfolio" className="gap-2">
                <Image className="w-4 h-4" />
                Portfolio
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="sessions" className="gap-2">
                <Monitor className="w-4 h-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="portfolio" className="mt-6 space-y-6">
              <PortfolioUpload userId={userId} onUploadComplete={() => loadProfile(userId)} />
              <PortfolioGrid userId={userId} editable />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <ProfileAnalytics userId={userId} />
            </TabsContent>

            <TabsContent value="sessions" className="mt-6">
              <UserSessions userId={userId} />
            </TabsContent>

            <TabsContent value="settings" className="mt-6 space-y-6">
              <ReferralCard />
              <MyAppeals />
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Account Type</p>
                      <p className="text-sm text-muted-foreground">
                        {userRole ? userRole.replace('_', ' ').charAt(0).toUpperCase() + userRole.replace('_', ' ').slice(1) : 'User'}
                      </p>
                    </div>
                    <Badge variant="outline">{userRole || 'user'}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Verification Status</p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.is_verified ? 'Your account is verified' : 'Account not yet verified'}
                      </p>
                    </div>
                    <Badge variant={profile?.is_verified ? "default" : "secondary"}>
                      {profile?.is_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>

                  {getAdminLink() && (
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium">Admin Access</p>
                        <p className="text-sm text-muted-foreground">
                          Access the admin dashboard
                        </p>
                      </div>
                      <Link to={getAdminLink()!}>
                        <Button size="sm" className="gap-1">
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Profile;
