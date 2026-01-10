import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface SkillTagsInputProps {
  userId: string;
  editable?: boolean;
}

export const SkillTagsInput = ({ userId, editable = true }: SkillTagsInputProps) => {
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSkills();
  }, [userId]);

  const loadSkills = async () => {
    const { data, error } = await supabase
      .from("user_skill_tags")
      .select("skill")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading skills:", error);
    } else {
      setSkills(data?.map(s => s.skill) || []);
    }
    setLoading(false);
  };

  const addSkill = async () => {
    const trimmedSkill = newSkill.trim().toLowerCase();
    
    if (!trimmedSkill) return;
    
    if (skills.includes(trimmedSkill)) {
      toast.error("Skill already added");
      return;
    }

    if (skills.length >= 10) {
      toast.error("Maximum 10 custom skills allowed");
      return;
    }

    const { error } = await supabase
      .from("user_skill_tags")
      .insert({ user_id: userId, skill: trimmedSkill });

    if (error) {
      toast.error("Failed to add skill");
    } else {
      setSkills([...skills, trimmedSkill]);
      setNewSkill("");
      toast.success("Skill added");
    }
  };

  const removeSkill = async (skill: string) => {
    const { error } = await supabase
      .from("user_skill_tags")
      .delete()
      .eq("user_id", userId)
      .eq("skill", skill);

    if (error) {
      toast.error("Failed to remove skill");
    } else {
      setSkills(skills.filter(s => s !== skill));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  if (loading) {
    return <div className="animate-pulse h-8 bg-muted rounded" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-secondary" />
        <span className="text-sm font-medium">Custom Skills</span>
        <span className="text-xs text-muted-foreground">({skills.length}/10)</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <Badge key={skill} variant="secondary" className="gap-1 pr-1">
            {skill}
            {editable && (
              <button
                onClick={() => removeSkill(skill)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
        
        {skills.length === 0 && !editable && (
          <span className="text-sm text-muted-foreground">No custom skills</span>
        )}
      </div>

      {editable && (
        <div className="flex gap-2">
          <Input
            placeholder="Add a custom skill..."
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            maxLength={50}
          />
          <Button 
            type="button" 
            size="sm" 
            onClick={addSkill}
            disabled={!newSkill.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
