import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { triageMessage } from "@/lib/triage.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClareCare — Patient Chat" },
      {
        name: "description",
        content:
          "Ask general health questions or describe symptoms. ClareCare's AI triages your message and connects you with a clinician when needed.",
      },
      { property: "og:title", content: "ClareCare — Patient Chat" },
      {
        property: "og:description",
        content:
          "Calm, plain-language AI triage. A clinician follows up when you need real care.",
      },
    ],
  }),
  component: PatientChat,
});

type Urgency = "low" | "medium" | "high";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  escalated?: boolean;
  urgency?: Urgency;
};

const URGENCY_LABEL: Record<Urgency, string> = {
  low: "Low urgency",
  medium: "Medium urgency",
  high: "High urgency",
};

function PatientChat() {
  const triage = useServerFn(triageMessage);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm ClareCare. Tell me what's going on or ask a general health question — I'll help where I can and flag your case to a clinician if it needs real attention.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;
    setError(null);
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const result = await triage({
        data: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: result.reply,
          escalated: result.escalated,
          urgency: result.urgency as Urgency,
        },
      ]);
    } catch (e) {
      console.error(e);
      setError("Sorry — something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-medical-blue-soft/40 via-background to-background">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-4 pt-6">
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border/70 bg-card/80 px-4 py-3 shadow-sm">
          <ShieldCheck className="h-4 w-4 shrink-0 text-medical-green" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            ClareCare offers general guidance, not a diagnosis. If you think
            you're having a medical emergency, call your local emergency number.
          </p>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
          style={{ maxHeight: "calc(100vh - 240px)" }}
        >
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
          {pending && (
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-medical-blue" />
              ClareCare is thinking…
            </div>
          )}
          {error && (
            <p className="px-1 text-xs text-destructive">{error}</p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mt-3 flex items-end gap-2 rounded-2xl border border-border/70 bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/50"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Describe symptoms or ask a question…"
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-medical-blue text-primary-foreground transition-opacity disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </main>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-md bg-medical-blue text-primary-foreground"
            : "rounded-bl-md border border-border/70 bg-background text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.escalated && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-medical-green/30 bg-medical-green-soft px-2 py-1 text-xs text-foreground">
            <AlertTriangle className="h-3 w-3 text-medical-green" />
            <span>
              Flagged for clinician follow-up
              {message.urgency
                ? ` · ${URGENCY_LABEL[message.urgency]}`
                : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
