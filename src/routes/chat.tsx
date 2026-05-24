import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, HelpCircle, ChevronDown, Stethoscope, X } from "lucide-react";
import { triageMessage, requestHumanReview } from "@/lib/triage.functions";

export const Route = createFileRoute("/chat")({
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

type PatientInfo = { name: string; phone: string };

type Lang = "en" | "zh" | "ms";

const WELCOME = `Welcome to ClareCare 👋

I can help with:
• General health information
• Medication-related questions
• Appointment preparation
• Basic symptom guidance

I am not a doctor and I cannot provide a diagnosis or prescription.

If this is an emergency, please call 999 or seek urgent medical care.`;

const LANG_PROMPT = "Before we continue, please choose your preferred language.";

const LANG_THANKS: Record<Lang, string> = {
  en: "Thanks. Please describe your symptom or ask your health question.",
  zh: "谢谢。请描述你的症状，或输入你想询问的健康问题。",
  ms: "Terima kasih. Sila terangkan simptom anda atau tanya soalan kesihatan anda.",
};

const INPUT_PLACEHOLDER: Record<Lang, string> = {
  en: "Describe symptoms or ask a question…",
  zh: "描述你的症状或提问…",
  ms: "Terangkan simptom atau tanya soalan…",
};

const STORAGE_KEY = "clarecare_patient";

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function loadPatient(): PatientInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PatientInfo;
    if (parsed?.name && parsed?.phone) return parsed;
    return null;
  } catch {
    return null;
  }
}

function PatientChat() {
  const triage = useServerFn(triageMessage);
  const review = useServerFn(requestHumanReview);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: WELCOME, escalated: false, reviewState: "idle" },
    { id: "lang-prompt", role: "assistant", content: LANG_PROMPT, escalated: false, reviewState: "idle" },
  ]);
  const [lang, setLang] = useState<Lang | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${Math.max(next, 56)}px`;
  }, [input]);

  useEffect(() => {
    setPatient(loadPatient());
    setHydrated(true);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  const send = async () => {
    const text = input.trim();
    if (!text || pending || !patient) return;
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
          patientName: patient.name,
          patientPhone: patient.phone,
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
    if (!patient) return;
    setMessages((m) =>
      m.map((msg) => (msg.id === messageId ? { ...msg, reviewState: "pending" } : msg)),
    );
    try {
      await review({
        data: {
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          patientName: patient.name,
          patientPhone: patient.phone,
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

      {/* Minimal patient header — logo only, no clinician/admin links */}
      <header className="sticky top-[26px] z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-medical-blue text-primary-foreground">
              <Stethoscope className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              ClareCare
            </span>
          </Link>
        </div>
      </header>

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
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Describe symptoms or ask a question…"
            rows={2}
            style={{ minHeight: 56, maxHeight: 160 }}
            className="min-w-0 flex-1 resize-none overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-3 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
            disabled={pending || !patient}
          />
          <button
            type="submit"
            disabled={pending || !input.trim() || !patient}
            className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl bg-medical-blue text-primary-foreground transition-opacity disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <GuidancePanel onPickTemplate={(t) => setInput(t)} />
      </main>

      {hydrated && !patient && (
        <IntakeOverlay
          onSubmit={(info) => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
            setPatient(info);
          }}
        />
      )}
    </div>
  );
}

function IntakeOverlay({
  onSubmit,
}: {
  onSubmit: (info: PatientInfo) => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const p = phone.trim();
    if (n.length < 2) return setErr("Please enter your full name.");
    if (p.length < 7) return setErr("Please enter a valid phone number.");
    setErr(null);
    onSubmit({ name: n, phone: p });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-medical-blue text-primary-foreground">
            <Stethoscope className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Welcome to ClareCare
            </h2>
            <p className="text-xs text-muted-foreground">
              Just two quick details before we start.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="+44 7700 900123"
            />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-medical-blue py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Start Chat
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            We use this so a clinician can follow up if needed.
          </p>
        </form>
      </div>
    </div>
  );
}

const TEMPLATES: Record<string, string> = {
  general: "I would like to ask about ____.",
  symptom: [
    "My main symptom is ____.",
    "It started ____.",
    "The severity is __/10.",
    "I have / do not have chest pain, breathing difficulty, bleeding, confusion, or fainting.",
    "I am taking ____.",
    "I have allergies to ____.",
  ].join("\n"),
  medication: [
    "I have a question about this medicine: ____.",
    "I want to know about ____.",
    "I am currently taking ____.",
    "I have allergies to ____.",
  ].join("\n"),
  clinician: [
    "I would like a clinician to review my case.",
    "My concern is ____.",
    "It started ____.",
    "My symptoms are ____.",
    "The severity is ____.",
    "I am taking ____.",
    "My reason for review is ____.",
  ].join("\n"),
};


function GuidancePanel({
  onPickTemplate,
}: {
  onPickTemplate: (template: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const pick = (key: keyof typeof TEMPLATES) => {
    onPickTemplate(TEMPLATES[key]);
    setOpen(false);
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-medical-blue/20 bg-medical-blue-soft/60 px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-medical-blue-soft"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-medical-blue" />
          What should I include?
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-medical-blue/20 bg-card p-4 text-sm shadow-sm">
          <p className="text-muted-foreground">
            To help ClareCare understand your situation better, please include:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-foreground/90">
            <li>Your main symptom or question</li>
            <li>When it started</li>
            <li>How serious it is: mild, moderate, severe, or 1–10</li>
            <li>
              Any red flag symptoms such as chest pain, difficulty breathing,
              severe bleeding, confusion, fainting, or severe allergic reaction
            </li>
            <li>Any medication you are taking or allergies you have</li>
            <li>
              Whether you want general advice, pharmacist review, or clinician
              review
            </li>
          </ol>
          <p className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800">
            If this is an emergency, call 999 or seek emergency care
            immediately.
          </p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick start templates
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <QuickButton onClick={() => pick("general")}>
              General health question
            </QuickButton>
            <QuickButton onClick={() => pick("symptom")}>
              Symptom check
            </QuickButton>
            <QuickButton onClick={() => pick("medication")}>
              Medication question
            </QuickButton>
            <QuickButton onClick={() => pick("clinician")}>
              Request clinician review
            </QuickButton>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-medical-green/30 bg-medical-green-soft px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-medical-green/20"
    >
      {children}
    </button>
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

      <span
        className={
          escalated
            ? "inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
            : "inline-flex items-center gap-1 rounded-full border border-medical-green/30 bg-medical-green-soft px-2 py-0.5 text-[11px] font-medium text-foreground"
        }
      >
        {escalated ? "🔔 Flagging for clinician" : "✓ Handled by ClareCare"}
      </span>

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
