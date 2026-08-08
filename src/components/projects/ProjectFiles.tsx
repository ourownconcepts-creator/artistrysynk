import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type UploadStatus = "queued" | "uploading" | "processing" | "ready" | "failed";

interface ProjectFileRow {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string | null;
  upload_status: UploadStatus;
  upload_progress: number;
  error_message: string | null;
}

const STATUS_META: Record<
  UploadStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  queued: { label: "Queued", icon: Clock, className: "bg-muted text-muted-foreground" },
  uploading: { label: "Uploading", icon: Loader2, className: "bg-primary/15 text-primary" },
  processing: { label: "Processing", icon: Loader2, className: "bg-accent/20 text-accent-foreground" },
  ready: { label: "Ready", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-600" },
  failed: { label: "Failed", icon: AlertCircle, className: "bg-destructive/15 text-destructive" },
};

const humanSize = (bytes: number | null) => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

/**
 * Project room files with real-time upload progress and lifecycle states.
 * Local progress is instant for the uploader; status changes replicate to
 * everyone else in the room through Realtime.
 */
export const ProjectFiles = ({
  projectId,
  currentUserId,
}: {
  projectId: string;
  currentUserId: string;
}) => {
  const [files, setFiles] = useState<ProjectFileRow[]>([]);
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setFiles((data ?? []) as ProjectFileRow[]);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`project-files-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_files", filter: `project_id=eq.${projectId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, load]);

  const setStatus = async (
    id: string,
    upload_status: UploadStatus,
    extra: Partial<Pick<ProjectFileRow, "upload_progress" | "file_url" | "error_message">> = {},
  ) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, upload_status, ...extra } as ProjectFileRow : f)),
    );
    await supabase.from("project_files").update({ upload_status, ...extra }).eq("id", id);
  };

  const putToStorage = (path: string, file: File, onProgress: (pct: number) => void) =>
    new Promise<void>((resolve, reject) => {
      void (async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          reject(new Error("You need to be signed in to upload"));
          return;
        }
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/portfolios/${path}`,
        );
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string);
        xhr.setRequestHeader("x-upsert", "true");
        if (file.type) xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      })();
    });

  const startUpload = async (file: File) => {
    const path = `${projectId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;

    // 1. Queued row so every member sees the file immediately
    const { data: row, error } = await supabase
      .from("project_files")
      .insert({
        project_id: projectId,
        uploaded_by: currentUserId,
        file_name: file.name,
        file_url: "",
        file_type: file.type || null,
        file_size: file.size,
        upload_status: "queued",
        upload_progress: 0,
      })
      .select()
      .single();

    if (error || !row) {
      toast.error("Could not queue the upload");
      return;
    }

    const id = row.id;
    setFiles((prev) => [row as ProjectFileRow, ...prev]);
    setLocalProgress((p) => ({ ...p, [id]: 0 }));

    try {
      // 2. Uploading
      await setStatus(id, "uploading", { upload_progress: 0 });
      let lastPersisted = 0;
      await putToStorage(path, file, (pct) => {
        setLocalProgress((p) => ({ ...p, [id]: pct }));
        if (pct - lastPersisted >= 20 && pct < 100) {
          lastPersisted = pct;
          void supabase.from("project_files").update({ upload_progress: pct }).eq("id", id);
        }
      });

      // 3. Processing
      await setStatus(id, "processing", { upload_progress: 100 });
      const {
        data: { publicUrl },
      } = supabase.storage.from("portfolios").getPublicUrl(path);

      // 4. Ready
      await setStatus(id, "ready", { upload_progress: 100, file_url: publicUrl });
      toast.success(`${file.name} is ready`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      await setStatus(id, "failed", { error_message: message });
      toast.error(message);
    } finally {
      setLocalProgress((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of picked) {
      await startUpload(file);
    }
  };

  const removeFile = async (file: ProjectFileRow) => {
    const { error } = await supabase.from("project_files").delete().eq("id", file.id);
    if (error) {
      toast.error("Could not remove the file");
      return;
    }
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  };

  const activeCount = files.filter((f) =>
    ["queued", "uploading", "processing"].includes(f.upload_status),
  ).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Files
          {activeCount > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {activeCount} in progress
            </Badge>
          ) : null}
        </CardTitle>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            id="project-file-upload"
            className="hidden"
            onChange={(e) => void onPick(e)}
          />
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No files uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => {
              const meta = STATUS_META[file.upload_status] ?? STATUS_META.ready;
              const Icon = meta.icon;
              const spinning = file.upload_status === "uploading" || file.upload_status === "processing";
              const pct = localProgress[file.id] ?? file.upload_progress;
              const isReady = file.upload_status === "ready" && Boolean(file.file_url);

              return (
                <div key={file.id} className="rounded-xl border bg-card/50 p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      {isReady ? (
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-sm font-medium hover:text-primary"
                        >
                          {file.file_name}
                        </a>
                      ) : (
                        <p className="truncate text-sm font-medium">{file.file_name}</p>
                      )}
                      <p className="truncate text-xs text-muted-foreground">
                        {humanSize(file.file_size)}
                        {file.created_at
                          ? ` · ${formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}`
                          : ""}
                        {file.error_message ? ` · ${file.error_message}` : ""}
                      </p>
                    </div>
                    <Badge className={`gap-1 text-[10px] ${meta.className}`} variant="secondary">
                      <Icon className={`h-3 w-3 ${spinning ? "animate-spin" : ""}`} />
                      {meta.label}
                    </Badge>
                    {file.uploaded_by === currentUserId ? (
                      <div className="flex items-center gap-1">
                        {file.upload_status === "failed" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={`Remove failed upload ${file.file_name}`}
                            onClick={() => void removeFile(file)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${file.file_name}`}
                          onClick={() => void removeFile(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {file.upload_status !== "ready" && file.upload_status !== "failed" ? (
                    <Progress
                      value={file.upload_status === "processing" ? 100 : pct}
                      className="mt-2 h-1.5"
                      aria-label={`${file.file_name} upload progress`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
