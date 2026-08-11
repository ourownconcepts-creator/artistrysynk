import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Handshake } from "lucide-react";

type IntroContext = {
  intro: boolean;
  status?: string;
  note?: string | null;
  accepted_at?: string | null;
  initiated_by?: { username: string | null; name: string | null };
  owner?: { username: string | null; name: string | null };
  trusted?: { username: string | null; name: string | null };
};

const label = (p?: { username: string | null; name: string | null }) =>
  p?.name || (p?.username ? `@${p.username}` : "a trusted member");

/**
 * Explains why an introduction thread is accessible: who vouched, when it was
 * accepted, and the note that came with the introduction.
 */
export const IntroContextBanner = ({ conversationId }: { conversationId?: string }) => {
  const [context, setContext] = useState<IntroContext | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setContext(null);
      return;
    }
    let active = true;
    void (async () => {
      const { data, error } = await supabase.rpc("conversation_intro_context", {
        _conversation_id: conversationId,
      });
      if (!active || error) return;
      setContext(data as unknown as IntroContext);
    })();
    return () => {
      active = false;
    };
  }, [conversationId]);

  if (!context?.intro) return null;

  return (
    <Alert className="mx-4 mt-3 w-auto border-primary/30 bg-primary/5">
      <Handshake className="h-4 w-4 text-primary" aria-hidden="true" />
      <AlertTitle>Trusted introduction</AlertTitle>
      <AlertDescription className="space-y-1 text-xs">
        <p>
          This chat is open because {label(context.initiated_by)} introduced you to{" "}
          {label(context.trusted)}
          {context.accepted_at
            ? ` and it was accepted on ${new Date(context.accepted_at).toLocaleDateString()}`
            : ""}
          . Only the two of you can see it.
        </p>
        {context.note ? <p className="italic">“{context.note}”</p> : null}
      </AlertDescription>
    </Alert>
  );
};