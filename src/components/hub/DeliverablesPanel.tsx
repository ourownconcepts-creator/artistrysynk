import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Package, Plus, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState, SectionHeader, Surface } from "@/components/native-ui";

type Deliverable = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  review_url: string | null;
  created_by: string;
};

export type HubMember = { user_id: string; role: string | null; full_name: string; avatar_url: string | null };

const STATUSES = ["pending", "in_review", "approved", "delivered"] as const;
const LABELS: Record<string, string> = {
  pending: "In progress",
  in_review: "In review",
  approved: "Approved",
  delivered: "Delivered",
};

export function DeliverablesPanel({
  projectId,
  currentUserId,
  members,
}: {
  projectId: string;
  currentUserId: string;
  members: HubMember[];
}) {
  const [items, setItems] = useState<Deliverable[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", assigned_to: "unassigned", review_url: "" });

  const load = async () => {
    const { data } = await supabase
      .from("project_deliverables")
      .select("id, title, description, status, due_date, assigned_to, review_url, created_by")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true, nullsFirst: false });
    setItems((data as Deliverable[]) ?? []);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`hub-deliverables-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_deliverables", filter: `project_id=eq.${projectId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const nameFor = useMemo(
    () => (id: string | null) => members.find((m) => m.user_id === id)?.full_name ?? "Unassigned",
    [members],
  );

  const create = async () => {
    if (!form.title.trim()) {
      toast.error("Name the deliverable");
      return;
    }
    const { error } = await supabase.from("project_deliverables").insert({
      project_id: projectId,
      created_by: currentUserId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to === "unassigned" ? null : form.assigned_to,
      review_url: form.review_url.trim() || null,
    });
    if (error) {
      toast.error("Could not add the deliverable");
      return;
    }
    setOpen(false);
    setForm({ title: "", description: "", due_date: "", assigned_to: "unassigned", review_url: "" });
  };

  const setStatus = async (item: Deliverable, status: string) => {
    setItems((prev) => prev.map((d) => (d.id === item.id ? { ...d, status } : d)));
    const { error } = await supabase.from("project_deliverables").update({ status }).eq("id", item.id);
    if (error) {
      toast.error("Could not update status");
      void load();
    }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((d) => d.id !== id));
    const { error } = await supabase.from("project_deliverables").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove the deliverable");
      void load();
    }
  };

  const done = items.filter((d) => d.status === "delivered" || d.status === "approved").length;

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Deliverables"
        subtitle={items.length ? `${done} of ${items.length} signed off` : "What this project ships"}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New deliverable</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Final master" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Due date</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Owner</Label>
                    <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Review link</Label>
                  <Input value={form.review_url} onChange={(e) => setForm({ ...form, review_url: e.target.value })} placeholder="https://…" />
                </div>
                <Button className="w-full" onClick={create}>
                  Add deliverable
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="No deliverables yet"
          description="Define the outputs — masters, cuts, decks — and track them to sign-off."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id}>
              <Surface inset className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {nameFor(d.assigned_to)}
                      {d.due_date ? ` · due ${format(new Date(d.due_date), "d MMM")}` : ""}
                    </p>
                  </div>
                  <Badge variant={d.status === "delivered" || d.status === "approved" ? "secondary" : "outline"}>
                    {LABELS[d.status] ?? d.status}
                  </Badge>
                </div>
                {d.description ? <p className="text-xs leading-relaxed text-muted-foreground">{d.description}</p> : null}
                <div className="flex items-center gap-2">
                  <Select value={d.status} onValueChange={(v) => setStatus(d, v)}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {d.review_url ? (
                    <a
                      href={d.review_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Review
                    </a>
                  ) : null}
                  {d.created_by === currentUserId ? (
                    <Button variant="ghost" size="icon" className="ml-auto" aria-label="Remove deliverable" onClick={() => remove(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}