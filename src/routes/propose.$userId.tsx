import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "@/lib/router-compat";
import { buildPageHead } from "@/lib/seoHead";
import { db, PROPOSAL_BUCKET, PROPOSAL_MAX_BYTES } from "@/lib/collab";

export const Route = createFileRoute("/propose/$userId")({
  head: () =>
    buildPageHead({
      path: "/propose",
      title: "Send a collaboration proposal | ArtistrySynk",
      description: "Pitch your project idea to a creative on ArtistrySynk with a message and attached files.",
      noIndex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <ProposePage />
    </ProtectedRoute>
  ),
});

const schema = z.object({
  subject: z.string().trim().min(3, "Add a short title").max(150),
  message: z.string().trim().min(20, "Tell them a bit more (20+ characters)").max(3000),
});

function ProposePage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [target, setTarget] = useState<{ id: string; full_name: string } | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    supabase.rpc("get_public_profile", { _identifier: userId }).then(({ data }) => {
      const row = (data as { id: string; full_name: string }[] | null)?.[0];
      if (row) setTarget({ id: row.id, full_name: row.full_name });
    });
  }, [userId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me || !target) return;
    if (me === target.id) return toast.error("You can't send a proposal to yourself");
    const parsed = schema.safeParse({ subject, message });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Check the form");
    if (file && file.size > PROPOSAL_MAX_BYTES) return toast.error("Files must be 20 MB or smaller");
    setSending(true);
    let file_path: string | null = null;
    if (file) {
      const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
      file_path = `${me}/${target.id}/${crypto.randomUUID()}-${safe}`;
      const { error } = await supabase.storage.from(PROPOSAL_BUCKET).upload(file_path, file);
      if (error) {
        setSending(false);
        return toast.error("File upload failed");
      }
    }
    const { error } = await db("collaboration_proposals").insert({
      sender_id: me,
      recipient_id: target.id,
      subject: parsed.data.subject,
      message: parsed.data.message,
      file_path,
      file_name: file?.name.slice(0, 200) ?? null,
    });
    setSending(false);
    if (error) return toast.error("Couldn't send your proposal");
    toast.success(`Proposal sent to ${target.full_name}`);
    navigate("/proposals");
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
      <h1 className="text-3xl font-bold tracking-tight">Send a collaboration proposal</h1>
      <p className="mt-2 text-muted-foreground">
        {target ? <>Pitch your idea to <Link to={`/profile/${userId}`} className="font-semibold text-foreground hover:underline">{target.full_name}</Link>. Share what you're making, their role, timing and budget.</> : "Loading profile…"}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="subject">Project title</Label>
          <Input id="subject" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Afrobeats single — need a producer" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Your message</Label>
          <Textarea id="message" rows={8} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the project, the role you'd like them to play, dates and budget." />
          <p className="text-right text-xs text-muted-foreground">{message.length}/3000</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="file" className="flex items-center gap-2"><Paperclip className="h-4 w-4" />Attach a file (optional, up to 20 MB)</Label>
          <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <Button type="submit" disabled={sending || !target} className="w-full gap-2"><Send className="h-4 w-4" />{sending ? "Sending…" : "Send proposal"}</Button>
      </form>
    </main>
  );
}
