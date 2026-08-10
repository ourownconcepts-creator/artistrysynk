import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Records a short voice note with MediaRecorder and hands the resulting
 * audio blob (plus its duration) back to the chat for upload.
 */
export function VoiceNoteRecorder({
  onRecorded,
  disabled,
}: {
  onRecorded: (blob: Blob, durationSeconds: number) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const duration = seconds;
        setRecording(false);
        setSeconds(0);
        if (blob.size > 0) {
          setBusy(true);
          try {
            await onRecorded(blob, duration);
          } finally {
            setBusy(false);
          }
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= 119) {
            recorder.stop();
            stopTimer();
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stop = () => {
    stopTimer();
    recorderRef.current?.stop();
  };

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <span className="flex items-center gap-1.5 text-xs font-medium text-destructive" aria-live="polite">
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
        </span>
      ) : null}
      <Button
        type="button"
        variant={recording ? "destructive" : "ghost"}
        size="icon"
        className="rounded-full"
        disabled={disabled || busy}
        onClick={() => (recording ? stop() : void start())}
        aria-label={recording ? "Stop recording and send voice note" : "Record a voice note"}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : recording ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}