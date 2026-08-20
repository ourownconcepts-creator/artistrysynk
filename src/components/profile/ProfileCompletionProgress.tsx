import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
import { PROFILE_COLUMNS } from "@/lib/profileColumns";
  CheckCircle2, 
  Circle, 
  User, 
  Image, 
  MapPin, 
  FileText, 
  Palette, 
  Music, 
  Link as LinkIcon,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface ProfileCompletionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

interface ProfileCompletionProgressProps {
  userId: string;
}

export const ProfileCompletionProgress = ({ userId }: ProfileCompletionProgressProps) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProfileCompletionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProfileCompletion();
  }, [userId]);

  const checkProfileCompletion = async () => {
    setLoading(true);

    // Fetch all profile data in parallel
    const [profileResult, rolesResult, genresResult, portfolioResult] = await Promise.all([
      supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).single(),
      supabase.from('user_creative_roles').select('role').eq('user_id', userId),
      supabase.from('user_genres').select('genre').eq('user_id', userId),
      supabase.from('portfolio_items').select('id').eq('user_id', userId).limit(1),
    ]);

    const profile = profileResult.data;
    const roles = rolesResult.data || [];
    const genres = genresResult.data || [];
    const portfolio = portfolioResult.data || [];
    const socialLinks = (profile?.social_links as any) || {};

    const completionItems: ProfileCompletionItem[] = [
      {
        id: 'avatar',
        label: 'Add profile photo',
        icon: <User className="w-4 h-4" />,
        completed: !!profile?.avatar_url,
        action: '/edit-profile',
        priority: 'high',
      },
      {
        id: 'cover',
        label: 'Add cover image',
        icon: <Image className="w-4 h-4" />,
        completed: !!profile?.cover_image_url,
        action: '/edit-profile',
        priority: 'medium',
      },
      {
        id: 'bio',
        label: 'Write a bio',
        icon: <FileText className="w-4 h-4" />,
        completed: !!profile?.bio && profile.bio.length >= 20,
        action: '/edit-profile',
        priority: 'high',
      },
      {
        id: 'location',
        label: 'Add your location',
        icon: <MapPin className="w-4 h-4" />,
        completed: !!profile?.location,
        action: '/edit-profile',
        priority: 'medium',
      },
      {
        id: 'roles',
        label: 'Select creative roles',
        icon: <Palette className="w-4 h-4" />,
        completed: roles.length >= 1,
        action: '/edit-profile',
        priority: 'high',
      },
      {
        id: 'genres',
        label: 'Add music genres',
        icon: <Music className="w-4 h-4" />,
        completed: genres.length >= 1,
        action: '/edit-profile',
        priority: 'medium',
      },
      {
        id: 'portfolio',
        label: 'Upload portfolio work',
        icon: <Sparkles className="w-4 h-4" />,
        completed: portfolio.length >= 1,
        action: '/profile',
        priority: 'high',
      },
      {
        id: 'social',
        label: 'Add social links',
        icon: <LinkIcon className="w-4 h-4" />,
        completed: Object.values(socialLinks).some(v => !!v),
        action: '/edit-profile',
        priority: 'low',
      },
    ];

    setItems(completionItems);
    setLoading(false);
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const incompleteItems = items
    .filter(item => !item.completed)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  const getProgressColor = () => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-primary';
    if (percentage >= 50) return 'bg-secondary';
    return 'bg-accent';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-24 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if profile is 100% complete
  if (percentage === 100) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-6 h-6" />
            <div>
              <p className="font-medium">Profile Complete!</p>
              <p className="text-sm text-muted-foreground">Your profile is fully optimized for discovery</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Profile Completion</CardTitle>
          <Badge variant={percentage >= 75 ? "default" : "secondary"}>
            {percentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress value={percentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {completedCount} of {totalCount} items complete
          </p>
        </div>

        {incompleteItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Suggestions to improve your profile:</p>
            <div className="space-y-2">
              {incompleteItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Circle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{item.label}</span>
                    <Badge variant={getPriorityColor(item.priority) as any} className="text-xs">
                      {item.priority}
                    </Badge>
                  </div>
                  {item.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1"
                      onClick={() => navigate(item.action!)}
                    >
                      Add
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {incompleteItems.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{incompleteItems.length - 3} more items to complete
              </p>
            )}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/edit-profile')}
        >
          Complete Profile
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};
