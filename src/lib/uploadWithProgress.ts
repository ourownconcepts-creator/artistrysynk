import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file to a Supabase storage bucket through a signed upload URL so we
 * can report real byte-level progress via XHR (the storage SDK doesn't expose it).
 */
export async function uploadWithProgress(
  bucket: string,
  path: string,
  body: Blob,
  onProgress?: (percent: number) => void,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data?.signedUrl) return { error: error?.message ?? "Could not start upload" };

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.signedUrl, true);
    if (body.type) xhr.setRequestHeader("Content-Type", body.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      onProgress?.(100);
      resolve({ error: xhr.status >= 200 && xhr.status < 300 ? null : `Upload failed (${xhr.status})` });
    };
    xhr.onerror = () => resolve({ error: "Network error while uploading" });
    xhr.send(body);
  });
}
