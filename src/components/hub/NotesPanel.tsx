import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { NotebookPen, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState, SectionHeader, Surface } from "@/components/native-ui";

type Note = {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_by: string;
  updated_at: string;
};

export function NotesPanel({ projectId, currentUserId }: { projectId: string; currentUserId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });

  const load = async () => {
    const { data } = await supabase
      .from("project_notes")
      .select("id, title, content, is_pinned, created_by, updated_at")
      .eq("project_id", projectId)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    setNotes((data as Note[]) ?? []);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`hub-notes-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_notes", filter: `project_id=eq.${projectId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const create = async () => {
    if (!form.title.trim()) {
      toast.error("Give the note a title");
      return;
    }
    const { error } = await supabase.from("project_notes").insert({
      project_id: projectId,
      created_by: currentUserId,
      title: form.title.trim(),
      content: form.content,
    });
    if (error) {
      toast.error("Could not save the note");
      return;
    }
    setOpen(false);
    setForm({ title: "", content: "" });
  };

  const togglePin = async (note: Note) => {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n)));
    const { error } = await supabase.from("project_notes").update({ is_pinned: !note.is_pinned }).eq("id", note.id);
    if (error) {
      toast.error("Could not update the note");
      void load();
    }
  };

  const remove = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("project_notes").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the note");
      void load();
    }
  };

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Notes"
        subtitle="Shared context, references and decisions"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> New note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New note</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mix references" />
                </div>
                <div className="space-y-1.5">
                  <Label>Content</Label>
                  <Textarea
                    rows={7}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Write it down so nobody has to remember it."
                  />
                </div>
                <Button className="w-full" onClick={create}>
                  Save note
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={<NotebookPen className="h-6 w-6" />}
          title="No notes yet"
          description="Capture briefs, references and decisions so the team stays aligned."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {notes.map((n) => (
            <Surface key={n.id} inset className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold">{n.title}</p>
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon" aria-label={n.is_pinned ? "Unpin note" : "Pin note"} onClick={() => togglePin(n)}>
                    {n.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </Button>
                  {n.created_by === currentUserId ? (
                    <Button variant="ghost" size="icon" aria-label="Delete note" onClick={() => remove(n.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
              {n.content ? <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{n.content}</p> : null}
              <p className="text-[11px] text-muted-foreground">
                Updated {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}
              </p>
            </Surface>
          ))}
        </div>
      )}
    </section>
  );
}