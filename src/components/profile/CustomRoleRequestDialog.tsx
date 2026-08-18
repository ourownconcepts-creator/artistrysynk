import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { roleCategories } from "@/lib/creativeRoles";

interface Props {
  userId: string;
  /** Pre-selected category, e.g. "Beauty & Grooming". */
  defaultCategory?: string;
}

interface RoleRequest {
  id: string;
  requested_role: string;
  category: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const statusTone: Record<string, string> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

/** Lets a creative request a niche role that isn't in the official list yet. */
export const CustomRoleRequestDialog = ({ userId, defaultCategory = "Beauty & Grooming" }: Props) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [description, setDescription] = useState("");
  const [requests, setRequests] = useState<RoleRequest[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("custom_role_requests")
      .select("id, requested_role, category, status, admin_note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    setRequests((data as RoleRequest[]) ?? []);
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const submit = async () => {
    const trimmed = role.trim();
    if (trimmed.length < 2) {
      toast.error("Tell us the role title you want added");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("custom_role_requests").insert({
      user_id: userId,
      requested_role: trimmed,
      category,
      description: description.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Role request sent — we'll review it shortly");
    setRole("");
    setDescription("");
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            My role isn't listed
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a custom role</DialogTitle>
            <DialogDescription>
              Niche specialisms are welcome — tell us what you do and we'll add it to the official list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-role">Role title</Label>
              <Input
                id="custom-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Russian volume lash artist"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {roleCategories.map((c) => (
                    <SelectItem key={c.label} value={c.label}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-role-desc">What does this role involve?</Label>
              <Textarea
                id="custom-role-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the service or craft so we can classify it correctly."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {requests.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <Badge variant={(statusTone[r.status] ?? "secondary") as never} className="text-[10px]">
                {r.status}
              </Badge>
              <span className="truncate">
                {r.requested_role}
                {r.admin_note ? ` — ${r.admin_note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};