import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, HelpCircle, ChevronDown, Stethoscope, X } from "lucide-react";
import { triageMessage, requestHumanReview } from "@/lib/triage.functions";
import {
  FLOWS,
  FLOW_ORDER,
  RED_FLAG_MESSAGE,
  REVIEW_REQUESTED_MESSAGE,
  PHARMACIST_REQUESTED_MESSAGE,
  FREETEXT_PROMPT,
  FLOW_DONE_LABEL,
  type FlowKey,
  type Lang as FlowLang,
} from "@/lib/chat-flows";
import { DoctorPickerModal } from "@/components/DoctorPickerModal";
import { LiveChatPanel } from "@/components/LiveChatPanel";


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
  en: "Thanks. You can now describe your symptom, ask a general health question, or choose one of the quick options below.",
  zh: "谢谢。你现在可以描述你的症状、输入健康问题，或选择下面的快速选项。",
  ms: "Terima kasih. Anda boleh menerangkan simptom, bertanya soalan kesihatan, atau memilih pilihan pantas di bawah.",
};


const INPUT_PLACEHOLDER: Record<Lang, string> = {
  en: "Describe symptoms or ask a question…",
  zh: "描述你的症状或提问…",
  ms: "Terangkan simptom atau tanya soalan…",
};

const STORAGE_KEY = "clarecare_patient";
const ASSIGNMENT_KEY = "clarecare_assignment";

type Assignment = {
  assignmentId: string;
  doctorId: string;
  doctorName: string;
};

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

function loadAssignment(): Assignment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ASSIGNMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Assignment;
    if (parsed?.assignmentId && parsed?.doctorName) return parsed;
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
  const [reviewState, setReviewState] = useState<
    "idle" | "pending" | "sent" | "resolved"
  >("idle");
  const [showInputTip, setShowInputTip] = useState(false);
  const [activeFlow, setActiveFlow] = useState<{
    key: FlowKey;
    step: number;
    awaitingFreeText?: boolean;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    if (!patient || !lang) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("clarecare_tour_chat")) return;
    setShowInputTip(true);
    const t = setTimeout(() => {
      setShowInputTip(false);
      try {
        sessionStorage.setItem("clarecare_tour_chat", "1");
      } catch {}
    }, 4000);
    return () => clearTimeout(t);
  }, [patient, lang]);

  const dismissInputTip = () => {
    if (!showInputTip) return;
    setShowInputTip(false);
    try {
      sessionStorage.setItem("clarecare_tour_chat", "1");
    } catch {}
  };


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

  const callTriage = async (history: ChatMessage[]) => {
    if (!patient) return;
    setPending(true);
    try {
      const result = await triage({
        data: {
          messages: history.map((m) => ({ role: m.role, content: m.content })),
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

  const escalateFlow = async (
    history: ChatMessage[],
    assistantText: string,
    urgency: Urgency,
  ) => {
    if (!patient) return;
    setPending(true);
    try {
      await review({
        data: {
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          patientName: patient.name,
          patientPhone: patient.phone,
        },
      });
      setMessages((m) => [
        ...m,
        {
          id: makeId(),
          role: "assistant",
          content: assistantText,
          escalated: true,
          urgency,
          reviewState: "idle",
        },
      ]);
    } catch (e) {
      console.error(e);
      setError("Couldn't submit review request. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || pending || !patient) return;
    setError(null);
    const userMsg: ChatMessage = { id: makeId(), role: "user", content: text };
    const next: ChatMessage[] = [...messages, userMsg];
    setMessages(next);
    setInput("");

    // Continuing an active flow with free-text input
    if (lang && activeFlow?.awaitingFreeText) {
      const flow = FLOWS[lang][activeFlow.key];
      const nextStep = activeFlow.step + 1;
      if (nextStep < flow.steps.length) {
        setActiveFlow({ key: activeFlow.key, step: nextStep });
        setMessages((m) => [
          ...m,
          {
            id: makeId(),
            role: "assistant",
            content: flow.steps[nextStep].question,
            reviewState: "idle",
          },
        ]);
        return;
      }
      setActiveFlow(null);
      await callTriage(next);
      return;
    }

    // User typed freely while flow buttons were visible → cancel flow
    if (activeFlow) setActiveFlow(null);

    await callTriage(next);
  };

  const startFlow = (key: FlowKey) => {
    if (!lang || pending) return;
    const flow = FLOWS[lang][key];
    setMessages((m) => [
      ...m,
      { id: makeId(), role: "user", content: flow.label },
      {
        id: makeId(),
        role: "assistant",
        content: flow.steps[0].question,
        reviewState: "idle",
      },
    ]);
    setActiveFlow({ key, step: 0 });
  };

  const answerFlow = async (option: {
    label: string;
    redFlag?: boolean;
    freeText?: boolean;
    requestReview?: boolean;
    requestPharmacist?: boolean;
  }) => {
    if (!lang || !activeFlow || pending) return;
    const flow = FLOWS[lang][activeFlow.key];
    const userMsg: ChatMessage = { id: makeId(), role: "user", content: option.label };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);

    if (option.redFlag) {
      setActiveFlow(null);
      await escalateFlow(newHistory, RED_FLAG_MESSAGE[lang as FlowLang], "high");
      return;
    }
    if (option.requestReview) {
      setActiveFlow(null);
      await escalateFlow(
        newHistory,
        REVIEW_REQUESTED_MESSAGE[lang as FlowLang],
        "medium",
      );
      return;
    }
    if (option.requestPharmacist) {
      setActiveFlow(null);
      await escalateFlow(
        newHistory,
        PHARMACIST_REQUESTED_MESSAGE[lang as FlowLang],
        "low",
      );
      return;
    }
    if (option.freeText) {
      setActiveFlow({ ...activeFlow, awaitingFreeText: true });
      setMessages((m) => [
        ...m,
        {
          id: makeId(),
          role: "assistant",
          content: FREETEXT_PROMPT[lang as FlowLang],
          reviewState: "idle",
        },
      ]);
      return;
    }

    const nextStep = activeFlow.step + 1;
    if (nextStep < flow.steps.length) {
      setActiveFlow({ key: activeFlow.key, step: nextStep });
      setMessages((m) => [
        ...m,
        {
          id: makeId(),
          role: "assistant",
          content: flow.steps[nextStep].question,
          reviewState: "idle",
        },
      ]);
    } else {
      setActiveFlow(null);
      await callTriage(newHistory);
    }
  };


  const handleReviewRequest = async () => {
    if (!patient) return;
    setReviewState("pending");
    try {
      await review({
        data: {
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          patientName: patient.name,
          patientPhone: patient.phone,
        },
      });
      setReviewState("sent");
    } catch (e) {
      console.error(e);
      setReviewState("idle");
      setError("Couldn't submit review request. Please try again.");
    }
  };

  const hasUserMessage = messages.some((m) => m.role === "user" && m.content !== "English" && m.content !== "中文" && m.content !== "Bahasa Melayu");
  const hasAssistantReply = (() => {
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return false;
    const idx = messages.length - 1 - lastUserIdx;
    return messages.slice(idx + 1).some((m) => m.role === "assistant");
  })();
  const showReviewCard = !!lang && hasUserMessage && hasAssistantReply && !pending;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-medical-blue-soft/40 via-background to-background">
      {/* Persistent disclaimer bar */}
      <div className="sticky top-0 z-40 w-full border-b border-border/60 bg-muted/70 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
        <p className="mx-auto max-w-3xl px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground">
          Guidance only • Not a diagnosis • Emergency? Call 999
        </p>
      </div>

      {/* Minimal patient header — logo only, no clinician/admin links */}
      <header className="border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center px-4 md:h-14">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-medical-blue text-primary-foreground md:h-8 md:w-8">
              <Stethoscope className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-semibold tracking-tight md:text-lg">
              ClareCare
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col px-3 pb-2 pt-2 md:px-4 md:pb-4 md:pt-4">
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 space-y-4 overflow-y-auto rounded-2xl border border-border/70 bg-card p-3 shadow-sm md:p-4"
        >
          {messages.map((m) => (
            <MessageRow key={m.id} message={m} />
          ))}
          {pending && (
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-medical-blue" />
              ClareCare is thinking…
            </div>
          )}
          {error && <p className="px-1 text-xs text-destructive">{error}</p>}

          {!lang && (
            <div className="flex flex-wrap gap-2 px-1 pt-1">
              {([
                { code: "en", label: "English" },
                { code: "zh", label: "中文" },
                { code: "ms", label: "Bahasa Melayu" },
              ] as const).map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setLang(l.code);
                    setMessages((m) => [
                      ...m,
                      { id: makeId(), role: "user", content: l.label },
                      {
                        id: makeId(),
                        role: "assistant",
                        content: LANG_THANKS[l.code],
                        reviewState: "idle",
                      },
                    ]);
                  }}
                  className="rounded-full border border-medical-blue/30 bg-medical-blue-soft px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-medical-blue/20"
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}

          {activeFlow && lang && !activeFlow.awaitingFreeText && !pending && (
            <FlowAnswers
              options={FLOWS[lang][activeFlow.key].steps[activeFlow.step].options}
              onPick={answerFlow}
            />
          )}

          {showReviewCard && lang && (
            <ReviewCard
              lang={lang}
              state={reviewState}
              onRequestReview={handleReviewRequest}
              onResolve={() => setReviewState("resolved")}
            />
          )}
        </div>


        <div className="relative mt-3">
          {showInputTip && (
            <div
              role="dialog"
              aria-label="Input tip"
              className="pointer-events-none absolute -top-2 left-1/2 z-30 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-full animate-fade-in rounded-2xl bg-medical-blue px-4 py-3 text-center text-primary-foreground shadow-2xl shadow-black/20"
            >
              <p className="text-sm leading-relaxed">
                Type your question or describe your symptoms here, then press send.
              </p>
              <span
                className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-medical-blue motion-safe:animate-bounce"
                aria-hidden="true"
              />
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2 rounded-2xl border border-border/70 bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/50"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                dismissInputTip();
              }}
              onKeyDown={(e) => {
                dismissInputTip();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={lang ? INPUT_PLACEHOLDER[lang] : "Please choose a language above…"}
              rows={2}
              style={{ minHeight: 56, maxHeight: 160 }}
              className="min-w-0 flex-1 resize-none overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-3 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              disabled={pending || !patient || !lang}
            />
            <button
              type="submit"
              disabled={pending || !input.trim() || !patient || !lang}
              className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl bg-medical-blue text-primary-foreground transition-opacity disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>


        {lang && !activeFlow && <GuidancePanel lang={lang} onStartFlow={startFlow} />}
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

const GUIDANCE_COPY: Record<Lang, {
  toggle: string;
  intro: string;
  items: string[];
  emergency: string;
}> = {
  en: {
    toggle: "What should I include?",
    intro: "To help ClareCare understand your situation better, please include:",
    items: [
      "Your main symptom or question",
      "When it started",
      "How serious it is: mild, moderate, severe, or 1–10",
      "Any red flag symptoms such as chest pain, difficulty breathing, severe bleeding, confusion, fainting, or severe allergic reaction",
      "Any medication you are taking or allergies you have",
      "Whether you want general advice, pharmacist review, or clinician review",
    ],
    emergency: "If this is an emergency, call 999 or seek urgent medical care immediately.",
  },
  zh: {
    toggle: "我应该包含什么？",
    intro: "为了让 ClareCare 更好地了解你的情况，请提供：",
    items: [
      "你的主要症状或问题",
      "症状什么时候开始",
      "严重程度：轻微、中等、严重，或 1–10 分",
      "是否有胸痛、呼吸困难、严重出血、意识混乱、昏倒或严重过敏反应",
      "你正在服用的药物或药物过敏",
      "你需要一般建议、药剂师复查，还是医生复查",
    ],
    emergency: "如果这是紧急情况，请立刻拨打 999 或寻求紧急医疗帮助。",
  },
  ms: {
    toggle: "Apa yang patut saya sertakan?",
    intro: "Untuk membantu ClareCare memahami keadaan anda dengan lebih baik, sila berikan:",
    items: [
      "Simptom utama atau soalan anda",
      "Bila ia bermula",
      "Tahap keterukan: ringan, sederhana, serius, atau 1–10",
      "Sama ada anda mengalami sakit dada, susah bernafas, pendarahan teruk, keliru, pengsan, atau reaksi alahan serius",
      "Ubat yang sedang diambil atau alahan ubat",
      "Sama ada anda mahu nasihat umum, semakan ahli farmasi, atau semakan doktor",
    ],
    emergency: "Jika ini kecemasan, sila hubungi 999 atau dapatkan rawatan kecemasan segera.",
  },
};

function GuidancePanel({
  lang,
  onStartFlow,
}: {
  lang: Lang;
  onStartFlow: (key: FlowKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const copy = GUIDANCE_COPY[lang];
  const chips = FLOW_ORDER.map((key) => ({ key, label: FLOWS[lang][key].label }));

  return (
    <div className="mt-3 space-y-3">
      {/* Quick action chips — start a guided flow */}
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onStartFlow(c.key)}
            className="rounded-full border border-medical-blue/30 bg-medical-blue-soft px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-medical-blue/15 sm:text-sm"
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Collapsible "what should I include?" guide */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-medical-blue/20 bg-medical-blue-soft/60 px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-medical-blue-soft"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-medical-blue" />
          {copy.toggle}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="rounded-2xl border border-medical-blue/20 bg-card p-4 text-sm shadow-sm">
          <p className="text-muted-foreground">{copy.intro}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/90">
            {copy.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800">
            {copy.emergency}
          </p>
        </div>
      )}
    </div>
  );
}

function FlowAnswers({
  options,
  onPick,
}: {
  options: {
    label: string;
    redFlag?: boolean;
    freeText?: boolean;
    requestReview?: boolean;
    requestPharmacist?: boolean;
  }[];
  onPick: (option: {
    label: string;
    redFlag?: boolean;
    freeText?: boolean;
    requestReview?: boolean;
    requestPharmacist?: boolean;
  }) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onPick(o)}
          className={
            o.redFlag
              ? "rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 sm:text-sm"
              : "rounded-full border border-medical-blue/30 bg-medical-blue-soft px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-medical-blue/15 sm:text-sm"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}





function MessageRow({ message }: { message: ChatMessage }) {
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

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border/70 bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {(escalated || message.urgency) && (
        <span
          className={
            escalated
              ? "inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
              : "inline-flex items-center gap-1 rounded-full border border-medical-green/30 bg-medical-green-soft px-2 py-0.5 text-[11px] font-medium text-foreground"
          }
        >
          {escalated ? "🔔 Flagging for clinician" : "✓ Handled by ClareCare"}
        </span>
      )}
    </div>
  );
}

const REVIEW_COPY: Record<Lang, {
  title: string;
  body: string;
  request: string;
  resolve: string;
  pending: string;
  sent: string;
  resolved: string;
}> = {
  en: {
    title: "Need more help?",
    body: "If you are still unsure or prefer human support, you can request a clinician review.",
    request: "Request clinician review",
    resolve: "Mark as resolved",
    pending: "Sending request…",
    sent: "Request sent — a clinician will follow up shortly.",
    resolved: "Glad we could help. You can start a new question anytime.",
  },
  zh: {
    title: "需要更多帮助？",
    body: "如果你仍不确定，或希望由真人协助，可以请求医生复查。",
    request: "请求医生复查",
    resolve: "标记为已解决",
    pending: "正在发送请求…",
    sent: "已发送 — 医生将尽快跟进。",
    resolved: "很高兴能帮到你。你随时可以提出新的问题。",
  },
  ms: {
    title: "Perlukan bantuan lanjut?",
    body: "Jika anda masih tidak pasti atau lebih suka bantuan manusia, anda boleh meminta semakan doktor.",
    request: "Minta semakan doktor",
    resolve: "Tanda sebagai selesai",
    pending: "Menghantar permintaan…",
    sent: "Permintaan dihantar — doktor akan menghubungi anda tidak lama lagi.",
    resolved: "Gembira dapat membantu. Anda boleh mulakan soalan baharu pada bila-bila masa.",
  },
};

function ReviewCard({
  lang,
  state,
  onRequestReview,
  onResolve,
}: {
  lang: Lang;
  state: "idle" | "pending" | "sent" | "resolved";
  onRequestReview: () => void;
  onResolve: () => void;
}) {
  const c = REVIEW_COPY[lang];

  if (state === "sent") {
    return (
      <div className="rounded-2xl border border-medical-green/30 bg-medical-green-soft px-4 py-3 text-sm text-foreground">
        ✓ {c.sent}
      </div>
    );
  }

  if (state === "resolved") {
    return (
      <div className="rounded-2xl border border-medical-green/30 bg-medical-green-soft px-4 py-3 text-sm text-foreground">
        ✓ {c.resolved}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-medical-blue/20 bg-medical-blue-soft/50 p-4 shadow-sm">
      <p className="font-display text-sm font-semibold text-foreground">{c.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRequestReview}
          disabled={state === "pending"}
          className="inline-flex items-center rounded-xl bg-medical-blue px-3 py-2 text-xs font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {state === "pending" ? c.pending : c.request}
        </button>
        <button
          type="button"
          onClick={onResolve}
          disabled={state === "pending"}
          className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {c.resolve}
        </button>
      </div>
    </div>
  );
}


