import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, DollarSign, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string | null;
  job_type: string;
  budget_range: string | null;
  required_roles: string[];
  required_skills: string[];
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface JobPostingCardProps {
  job: JobPosting;
  onApply?: (jobId: string) => void;
  isOwner?: boolean;
  onEdit?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  onViewApplications?: (jobId: string) => void;
}

export const JobPostingCard = ({ 
  job, 
  onApply, 
  isOwner = false,
  onEdit,
  onDelete,
  onViewApplications,
}: JobPostingCardProps) => {
  const jobTypeLabels: Record<string, string> = {
    contract: "Contract",
    "full-time": "Full-time",
    "part-time": "Part-time",
    gig: "Gig / One-time",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{job.title}</CardTitle>
            {job.profiles && (
              <p className="text-sm text-muted-foreground mt-1">
                Posted by {job.profiles.full_name}{' '}
                <span className="text-xs">@{job.profiles.username}</span>
                {job.profiles.is_verified && (
                  <span className="text-emerald-500 ml-1">✓</span>
                )}
              </p>
            )}
          </div>
          <Badge variant="outline">
            <Briefcase className="w-3 h-3 mr-1" />
            {jobTypeLabels[job.job_type] || job.job_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm line-clamp-3">{job.description}</p>
        
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {job.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {job.location}
            </div>
          )}
          {job.budget_range && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {job.budget_range}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
          </div>
        </div>

        {job.required_roles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.required_roles.map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        )}

        {job.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.required_skills.map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2 flex-wrap">
          {isOwner ? (
            <>
              <Button size="sm" variant="outline" onClick={() => onEdit?.(job.id)}>
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete?.(job.id)}>
                Delete
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onViewApplications?.(job.id)}>
                View Applications
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => onApply?.(job.id)} className="w-full">
              Apply Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
