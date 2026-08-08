import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell/AppShell";
import { Chip, Pressable, Surface } from "@/components/native-ui";
import { askSynkAi } from "@/lib/synk-ai.functions";
import { useAppUser } from "@/hooks/useAppUser";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Rewrite my bio so producers reach out",
  "Write 3 captions for my new single",
  "Which collaborators should I look for?",
  "Draft a collab proposal message",
  "Give me career insights for this month",
];

export default function SynkAI() {
  const { profile } = useAppUser();
  const ask = useServerFn(askSynkAi);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const context = profile
        ? `Name: ${profile.full_name ?? "unknown"}. Location: ${profile.city ?? profile.location ?? "unknown"}. Bio: ${profile.bio ?? "empty"}.`
        : undefined;
      const result = await ask({ data: { messages: next, context } });
      setMessages([...next, { role: "assistant", content: result.reply }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Synk AI could not respond");
      setMessages(next);
    } finally {
      setPending(false);
    }
  };

  return (
    <AppShell title="Synk AI" back>
      <div className="flex min-h-[70dvh] flex-col gap-4">
        {messages.length === 0 ? (
          <Surface level={1} className="p-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
              <Sparkles className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-lg font-bold">Your creative co-pilot</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Sharpen your profile, write captions and proposals, and find the right collaborators.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Chip key={s} onClick={() => void send(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </Surface>
        ) : (
          <div className="flex-1 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                    : "mr-auto max-w-[92%] rounded-3xl rounded-bl-lg bg-surface-1 px-4 py-3 text-sm shadow-app-sm"
                }
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1.5 [&_ul]:my-1.5">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            ))}
            {pending ? (
              <div className="mr-auto flex items-center gap-2 rounded-3xl bg-surface-1 px-4 py-3 text-sm text-muted-foreground shadow-app-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Synk AI is thinking…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="sticky bottom-[calc(var(--app-tabbar-h)+0.75rem)] flex items-end gap-2 rounded-3xl bg-surface-1 p-2 shadow-app lg:bottom-4"
        >
          <label className="sr-only" htmlFor="synk-input">
            Ask Synk AI
          </label>
          <textarea
            id="synk-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask Synk AI anything…"
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Pressable
            type="submit"
            aria-label="Send message"
            disabled={pending || !input.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </Pressable>
        </form>
      </div>
    </AppShell>
  );
}