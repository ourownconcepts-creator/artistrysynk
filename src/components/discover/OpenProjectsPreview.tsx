import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowRight } from "lucide-react";

interface QuickProject {
  id: string;
  title: string;
  project_category: string;
  compensation_type: string;
  looking_for: string[];
}

export const OpenProjectsPreview = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<QuickProject[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, title, project_category, compensation_type, looking_for")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(4);

    if (data) {
      setProjects(data.map(p => ({
        ...p,
        project_category: (p as any).project_category || "other",
        compensation_type: (p as any).compensation_type || "open_collaboration",
        looking_for: p.looking_for || [],
      })));
    }
  };

  if (projects.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Open Projects</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/open-projects")} className="text-xs">
          View All <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
      <div className="space-y-2">
        {projects.map(project => (
          <Card
            key={project.id}
            className="cursor-pointer hover:shadow-md transition-shadow-sm"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <CardContent className="p-3">
              <p className="font-medium text-sm truncate">{project.title}</p>
              <div className="flex gap-1 mt-1">
                <Badge variant="outline" className="text-xs">{project.project_category}</Badge>
                <Badge variant="secondary" className="text-xs">{project.compensation_type.replace(/_/g, " ")}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
