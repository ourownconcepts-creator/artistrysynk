import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isAfter } from "date-fns";
import { CalendarClock, Plus, Video, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState, SectionHeader, Surface, Chip } from "@/components/native-ui";
import { sanitizeExternalUrl, UGC_LINK_REL } from "@/lib/safeLinks";

type Meeting = {
  id: string;
  title: string;
  agenda: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  meeting_url: string | null;
  created_by: string;
};

export function MeetingsPanel({
  projectId,
  currentUserId,
}: {
  projectId: string;
  currentUserId: string;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", agenda: "", starts_at: "", ends_at: "", location: "", meeting_url: "" });

  const load = async () => {
    const { data } = await supabase
      .from("project_meetings")
      .select("id, title, agenda, starts_at, ends_at, location, meeting_url, created_by")
      .eq("project_id", projectId)
      .order("starts_at", { ascending: true });
    setMeetings((data as Meeting[]) ?? []);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`hub-meetings-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_meetings", filter: `project_id=eq.${projectId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const create = async () => {
    if (!form.title.trim() || !form.starts_at) {
      toast.error("Add a title and a start time");
      return;
    }
    const { error } = await supabase.from("project_meetings").insert({
      project_id: projectId,
      created_by: currentUserId,
      title: form.title.trim(),
      agenda: form.agenda.trim() || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      location: form.location.trim() || null,
      meeting_url: form.meeting_url.trim() || null,
    });
    if (error) {
      toast.error("Could not schedule the meeting");
      return;
    }
    toast.success("Meeting scheduled");
    setOpen(false);
    setForm({ title: "", agenda: "", starts_at: "", ends_at: "", location: "", meeting_url: "" });
  };

  const remove = async (id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    const { error } = await supabase.from("project_meetings").delete().eq("id", id);
    if (error) {
      toast.error("Could not cancel the meeting");
      void load();
    }
  };

  const now = new Date();
  const visible = meetings.filter((m) =>
    tab === "upcoming" ? isAfter(new Date(m.ends_at ?? m.starts_at), now) : !isAfter(new Date(m.ends_at ?? m.starts_at), now),
  );

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Meetings"
        subtitle="Sessions, reviews and check-ins"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule a meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Studio session" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Starts</Label>
                    <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ends</Label>
                    <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Agenda</Label>
                  <Textarea value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} placeholder="What are we covering?" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Location</Label>
                    <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Studio B" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Call link</Label>
                    <Input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://…" />
                  </div>
                </div>
                <Button className="w-full" onClick={create}>
                  Schedule meeting
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex gap-2">
        <Chip active={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          Upcoming
        </Chip>
        <Chip active={tab === "past"} onClick={() => setTab("past")}>
          Past
        </Chip>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title={tab === "upcoming" ? "Nothing scheduled" : "No past meetings"}
          description="Put the next session on the calendar so everyone shows up in sync."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((m) => (
            <li key={m.id}>
              <Surface inset className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(m.starts_at), "EEE d MMM · HH:mm")}
                      {m.ends_at ? ` – ${format(new Date(m.ends_at), "HH:mm")}` : ""}
                    </p>
                  </div>
                  {m.created_by === currentUserId ? (
                    <Button variant="ghost" size="icon" aria-label="Cancel meeting" onClick={() => remove(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                {m.agenda ? <p className="text-xs leading-relaxed text-muted-foreground">{m.agenda}</p> : null}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {m.location ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {m.location}
                    </span>
                  ) : null}
                  {sanitizeExternalUrl(m.meeting_url) ? (
                    <a
                      href={sanitizeExternalUrl(m.meeting_url)!}
                      target="_blank"
                      rel={UGC_LINK_REL}
                      className="flex items-center gap-1 font-medium text-primary"
                    >
                      <Video className="h-3.5 w-3.5" /> Join call
                    </a>
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