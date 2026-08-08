import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TrendingProject {
  id: string;
  title: string;
  description: string;
  looking_for: string[];
  created_at: string | null;
  member_count: number;
  creator: {
    full_name: string;
    avatar_url: string | null;
    is_verified: boolean | null;
  };
}

export const TrendingCollaborations = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<TrendingProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendingProjects();
  }, []);

  const loadTrendingProjects = async () => {
    // Fetch public projects with most members/activity
    const { data, error } = await supabase
      .from("projects")
      .select(`
        id,
        title,
        description,
        looking_for,
        created_at,
        profiles!projects_created_by_fkey (
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .eq("is_public", true)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error loading trending projects:", error);
      setLoading(false);
      return;
    }

    // Get member counts
    const projectsWithCounts = await Promise.all(
      (data || []).map(async (project) => {
        const { count } = await supabase
          .from("project_members")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project.id);

        return {
          id: project.id,
          title: project.title,
          description: project.description || "",
          looking_for: project.looking_for || [],
          created_at: project.created_at,
          member_count: (count || 0) + 1, // +1 for creator
          creator: project.profiles as any,
        };
      })
    );

    // Sort by member count (most popular)
    projectsWithCounts.sort((a, b) => b.member_count - a.member_count);
    setProjects(projectsWithCounts);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Trending Collaborations</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="min-w-[280px] animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded-sm w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded-sm w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Trending Collaborations</h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/open-projects")}
        >
          View All
        </Button>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
        {projects.map((project) => (
          <Card 
            key={project.id}
            className="min-w-[280px] max-w-[320px] cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold line-clamp-1">{project.title}</h3>
                {project.creator?.is_verified && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {project.description}
                </p>
              )}

              {project.looking_for.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.looking_for.slice(0, 3).map((role, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                  {project.looking_for.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{project.looking_for.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{project.member_count} members</span>
                </div>
                <span>{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
