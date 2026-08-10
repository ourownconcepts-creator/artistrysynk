import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UPLOAD_BUCKETS } from "@/config/uploads";

/**
 * Renders a chat image attachment from the private chat-images bucket.
 * Legacy attachments that were written to the voice-notes bucket keep working
 * through a fallback signing attempt.
 */
export function ImageAttachment({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const sign = async () => {
      if (/^https?:\/\//.test(path)) {
        if (active) setUrl(path);
        return;
      }
      const { data } = await supabase.storage.from(UPLOAD_BUCKETS.chatImages).createSignedUrl(path, 3600);
      if (data?.signedUrl) {
        if (active) setUrl(data.signedUrl);
        return;
      }
      const legacy = await supabase.storage.from(UPLOAD_BUCKETS.voiceNotes).createSignedUrl(path, 3600);
      if (active) setUrl(legacy.data?.signedUrl ?? null);
    };
    void sign();
    return () => {
      active = false;
    };
  }, [path]);

  if (!url) return <div className="h-40 w-52 animate-pulse rounded-xl bg-foreground/10" />;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="max-h-64 w-full max-w-[16rem] rounded-xl object-cover"
      />
    </a>
  );
}
