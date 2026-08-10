/**
 * Studio credits on a collaboration project. Attribution is a credit only:
 * attaching a studio never grants its members access to the project room,
 * which stays governed by project_members / is_project_member.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { BadgeCheck, Building2, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, SectionHeader } from "@/components/native-ui";
import { useMyStudios } from "@/hooks/useMyStudios";
import {
  attachStudioToProject,
  detachStudioFromProject,
  fetchProjectStudios,
  type ProjectStudioCredit,
} from "@/lib/studios";

type Props = {
  projectId: string;
  currentUserId: string | null;
  /** Only the project creator may attach or remove studio credits. */
  canManage: boolean;
};

export function ProjectStudioCredits({ projectId, currentUserId, canManage }: Props) {
  const [credits, setCredits] = useState<ProjectStudioCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studioId, setStudioId] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const { studios } = useMyStudios();

  const load = useCallback(async () => {
    try {
      setCredits(await fetchProjectStudios(projectId));
    } catch {
      // A missing credit list should never break the room view.
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Only roles that can represent the studio may be credited by this user.
  const attachable = studios.filter(
    (s) =>
      ["owner", "admin", "manager"].includes(s.role) &&
      !credits.some((c) => c.studio_id === s.studio.id),
  );

  const onAttach = async () => {
    if (!studioId || !currentUserId) return;
    setSaving(true);
    try {
      await attachStudioToProject({
        projectId,
        studioId,
        userId: currentUserId,
        roleLabel: roleLabel.trim(),
      });
      setStudioId("");
      setRoleLabel("");
      setAdding(false);
      await load();
      toast.success("Studio credited on this project");
    } catch {
      toast.error("Could not add that studio credit");
    } finally {
      setSaving(false);
    }
  };

  const onDetach = async (rowId: string) => {
    try {
      await detachStudioFromProject(rowId);
      setCredits((prev) => prev.filter((c) => c.id !== rowId));
    } catch {
      toast.error("Could not remove that studio credit");
    }
  };

  if (loading) return null;

  return (
    <section className="space-y-2">
      <SectionHeader
        title="Studio credits"
        subtitle={credits.length ? `${credits.length} credited` : "No studios credited yet"}
        action={
          canManage && attachable.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => setAdding((v) => !v)}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          ) : undefined
        }
      />

      {adding && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <Select value={studioId} onValueChange={setStudioId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a studio you represent" />
            </SelectTrigger>
            <SelectContent>
              {attachable.map((s) => (
                <SelectItem key={s.studio.id} value={s.studio.id}>
                  {s.studio.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Credit label (e.g. Recording studio)"
            value={roleLabel}
            onChange={(e) => setRoleLabel(e.target.value)}
          />
          <Button size="sm" onClick={onAttach} disabled={!studioId || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add credit
          </Button>
        </div>
      )}

      {credits.length === 0 ? (
        !adding ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No studio credits"
            description="Credit a studio, label, or agency that worked on this project."
          />
        ) : null
      ) : (
        <ul className="space-y-2">
          {credits.map((credit) => (
            <li
              key={credit.id}
              className="flex items-center gap-3 rounded-xl border border-border p-3"
            >
              <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {credit.studios ? (
                  <Link
                    to={`/studios/${credit.studios.handle}`}
                    className="flex items-center gap-1 truncate text-sm font-medium hover:underline"
                  >
                    {credit.studios.name}
                    {credit.studios.is_verified ? (
                      <BadgeCheck className="h-4 w-4 text-primary" />
                    ) : null}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">Studio</span>
                )}
                <p className="truncate text-xs text-muted-foreground">
                  {credit.role_label || "Contributor"}
                </p>
              </div>
              {canManage ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove studio credit"
                  onClick={() => onDetach(credit.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
