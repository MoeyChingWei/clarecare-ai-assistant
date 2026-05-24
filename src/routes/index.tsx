import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Stethoscope, Pill, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClareCare — Answers when you need them" },
      {
        name: "description",
        content:
          "Friendly health guidance from ClareCare. Ask anything, and a clinician will follow up when it matters.",
      },
      { property: "og:title", content: "ClareCare" },
      {
        property: "og:description",
        content:
          "Answers when you need them. A clinician when it matters.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [bounced, setBounced] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setBounced(false), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-medical-blue-soft/50 via-background to-background">
      {/* Top disclaimer */}
      <div className="w-full border-b border-border/60 bg-muted/70">
        <p className="mx-auto max-w-3xl px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground">
          Guidance only • Not a diagnosis • Emergency? Call 999
        </p>
      </div>

      {/* Header — logo only */}
      <header className="border-b border-border/70 bg-background/70 backdrop-blur">
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

      {/* Hero */}
      <section className="px-4 pb-12 pt-16 text-center sm:pt-24">
        <div className="mx-auto inline-grid h-20 w-20 place-items-center rounded-3xl bg-medical-blue text-primary-foreground shadow-lg shadow-medical-blue/20 sm:h-24 sm:w-24">
          <Stethoscope className="h-10 w-10 sm:h-12 sm:w-12" />
        </div>
        <h1 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
          ClareCare
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Answers when you need them. A clinician when it matters.
        </p>
        <button
          onClick={() => navigate({ to: "/chat" })}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-medical-blue px-6 py-3 text-sm font-medium text-primary-foreground shadow-md transition-all hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
          Start chat
        </button>
      </section>

      {/* Info cards */}
      <section className="px-4 pb-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            icon={<Pill className="h-5 w-5" />}
            emoji="💊"
            title="Medication Tips"
            body="Take your meds at the same time each day. Use a pill organiser or a phone reminder to avoid missed doses, and never stop a prescription early without checking."
          />
          <InfoCard
            icon={<Stethoscope className="h-5 w-5" />}
            emoji="🩺"
            title="When to See a Doctor"
            body="Don't ignore chest pain, sudden weakness, severe headaches, breathing trouble, or symptoms that get worse fast. Trust your instincts — if something feels serious, get help."
          />
          <InfoCard
            icon={<CalendarCheck className="h-5 w-5" />}
            emoji="📅"
            title="Appointment Prep"
            body="Write down your top 3 questions, your current medications, and how long your symptoms have lasted. A short prep makes a 10-minute visit much more useful."
          />
        </div>
      </section>

      {/* Ad placeholder */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-5xl rounded-2xl border-2 border-dashed border-border bg-muted/40 px-6 py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sponsored
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Partner health content goes here
          </p>
        </div>
      </section>

      {/* Floating chat bubble */}
      <button
        onClick={() => navigate({ to: "/chat" })}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-medical-blue text-primary-foreground shadow-xl shadow-medical-blue/30 transition-transform hover:scale-105 ${
          bounced ? "animate-bounce" : ""
        }`}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute right-1 top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-medical-green opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-medical-green border-2 border-medical-blue" />
        </span>
      </button>
    </div>
  );
}

function InfoCard({
  emoji,
  title,
  body,
}: {
  icon: React.ReactNode;
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="text-2xl">{emoji}</div>
      <h2 className="mt-3 font-display text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </article>
  );
}
