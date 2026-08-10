import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Renders a chat image attachment from the private media bucket. */
export function ImageAttachment({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const sign = async () => {
      if (/^https?:\/\//.test(path)) {
        if (active) setUrl(path);
        return;
      }
      const { data } = await supabase.storage.from("voice-notes").createSignedUrl(path, 3600);
      if (active) setUrl(data?.signedUrl ?? null);
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
