import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, HelpCircle, ChevronDown } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { triageMessage, requestHumanReview } from "@/lib/triage.functions";

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
  id: string;
  role: "user" | "assistant";
  content: string;
  escalated?: boolean;
  urgency?: Urgency;
  reviewState?: "idle" | "pending" | "sent";
};

const INTRO =
  "I help with 3 things: ① Medication questions ② Appointment prep ③ General health info. What brings you here today?";

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function PatientChat() {
  const triage = useServerFn(triageMessage);
  const review = useServerFn(requestHumanReview);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "intro", role: "assistant", content: INTRO, escalated: false, reviewState: "idle" },
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
    const next: ChatMessage[] = [
      ...messages,
      { id: makeId(), role: "user", content: text },
    ];
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
          id: makeId(),
          role: "assistant",
          content: result.reply,
          escalated: result.escalated,
          urgency: result.urgency as Urgency,
          reviewState: "idle",
        },
      ]);
    } catch (e) {
      console.error(e);
      setError("Sorry — something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const handleReviewRequest = async (messageId: string) => {
    setMessages((m) =>
      m.map((msg) => (msg.id === messageId ? { ...msg, reviewState: "pending" } : msg)),
    );
    try {
      await review({
        data: {
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      setMessages((m) =>
        m.map((msg) => (msg.id === messageId ? { ...msg, reviewState: "sent" } : msg)),
      );
    } catch (e) {
      console.error(e);
      setMessages((m) =>
        m.map((msg) => (msg.id === messageId ? { ...msg, reviewState: "idle" } : msg)),
      );
      setError("Couldn't submit review request. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-medical-blue-soft/40 via-background to-background">
      {/* Persistent disclaimer bar */}
      <div className="sticky top-0 z-40 w-full border-b border-border/60 bg-muted/70 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
        <p className="mx-auto max-w-3xl px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground">
          Guidance only • Not a diagnosis • Emergency? Call 999
        </p>
      </div>

      <AppHeader />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-4 pt-4">
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
          style={{ maxHeight: "calc(100vh - 220px)" }}
        >
          {messages.map((m) => (
            <MessageRow
              key={m.id}
              message={m}
              onRequestReview={() => handleReviewRequest(m.id)}
            />
          ))}
          {pending && (
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-medical-blue" />
              ClareCare is thinking…
            </div>
          )}
          {error && <p className="px-1 text-xs text-destructive">{error}</p>}
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

function MessageRow({
  message,
  onRequestReview,
}: {
  message: ChatMessage;
  onRequestReview: () => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-medical-blue px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const escalated = !!message.escalated;
  const reviewState = message.reviewState ?? "idle";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border/70 bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {/* Status badge */}
      <span
        className={
          escalated
            ? "inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
            : "inline-flex items-center gap-1 rounded-full border border-medical-green/30 bg-medical-green-soft px-2 py-0.5 text-[11px] font-medium text-foreground"
        }
      >
        {escalated ? "🔔 Flagging for clinician" : "✓ Handled by ClareCare"}
      </span>

      {/* Request human review */}
      {reviewState === "sent" ? (
        <span className="text-[11px] italic text-muted-foreground">
          Request sent — a clinician will follow up.
        </span>
      ) : (
        <button
          type="button"
          onClick={onRequestReview}
          disabled={reviewState === "pending"}
          className="text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          {reviewState === "pending"
            ? "Sending request…"
            : "Prefer to speak to someone? Request review"}
        </button>
      )}
    </div>
  );
}
