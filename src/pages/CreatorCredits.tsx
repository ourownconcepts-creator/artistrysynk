import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, Loader2 } from "lucide-react";
import { getRoleLabel } from "@/lib/creativeRoles";

interface Credit {
  id: string;
  role_title: string;
  is_verified: boolean;
  created_at: string;
  project?: {
    id: string;
    title: string;
    description: string;
    project_category: string;
  };
}

const CreatorCredits = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
        loadCredits(user.id);
      }
    });
  }, [navigate]);

  const loadCredits = async (uid: string) => {
    const { data, error } = await supabase
      .from("creator_credits")
      .select("*, projects(id, title, description, project_category)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCredits(data.map(c => ({ ...c, project: (c as any).projects })));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            My Credits
          </h1>
          <p className="text-muted-foreground">Verified project contributions and experience</p>
        </div>

        {credits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Award className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No credits yet</h2>
              <p className="text-muted-foreground">Complete projects to earn verified credits</p>
            </CardContent>
          </Card>
        ) : (
          credits.map(credit => (
            <Card key={credit.id} className="cursor-pointer hover:shadow-md transition-shadow-sm"
              onClick={() => credit.project && navigate(`/projects/${credit.project.id}`)}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{credit.project?.title || "Unknown Project"}</h3>
                      {credit.is_verified && (
                        <Badge variant="default" className="text-xs">Verified</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{credit.project?.description}</p>
                    <Badge variant="secondary">{getRoleLabel(credit.role_title)}</Badge>
                    {credit.project?.project_category && (
                      <Badge variant="outline" className="ml-2">{credit.project.project_category}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CreatorCredits;
