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

const TOUR_KEY = "clarecare_tour_landing_dismissed";

function LandingPage() {
  const navigate = useNavigate();
  const [bounced, setBounced] = useState(true);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBounced(false), 2200);
    if (typeof window !== "undefined" && !localStorage.getItem(TOUR_KEY)) {
      const tt = setTimeout(() => setShowTour(true), 600);
      return () => {
        clearTimeout(t);
        clearTimeout(tt);
      };
    }
    return () => clearTimeout(t);
  }, []);

  const dismissTour = () => {
    setShowTour(false);
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {}
  };


  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-medical-blue-soft/50 via-background to-background">
      {/* Top disclaimer */}
      <div className="w-full border-b border-border/60 bg-muted/70">
        <p className="mx-auto max-w-3xl px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground">
          Guidance only • Not a diagnosis • Emergency? Call 999
        </p>
      </div>

      {/* Doctor Access — subtle top-right */}
      <button
        onClick={() => navigate({ to: "/doctor-login" })}
        className="absolute right-3 top-8 z-20 rounded-full border border-medical-blue/40 bg-background/70 px-3 py-1 text-xs font-medium text-medical-blue backdrop-blur transition-colors hover:bg-medical-blue/10 sm:right-4 sm:top-9"
      >
        Doctor Access
      </button>

      <div className="flex flex-1 flex-col overflow-y-auto md:overflow-hidden">
        {/* Hero */}
        <section className="px-4 pb-4 pt-6 text-center sm:pb-8 sm:pt-12">
          <div className="mx-auto inline-grid h-14 w-14 place-items-center rounded-2xl bg-medical-blue text-primary-foreground shadow-lg shadow-medical-blue/20 sm:h-20 sm:w-20 sm:rounded-3xl">
            <Stethoscope className="h-7 w-7 sm:h-10 sm:w-10" />
          </div>
          <h1 className="mx-auto mt-3 max-w-2xl font-display text-2xl font-semibold tracking-tight text-foreground sm:mt-6 sm:text-5xl">
            ClareCare
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:mt-4 sm:text-lg">
            Answers when you need them. A clinician when it matters.
          </p>
          <button
            onClick={() => navigate({ to: "/chat" })}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-medical-blue px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md transition-all hover:opacity-90 sm:mt-8 sm:px-6 sm:py-3"
          >
            <MessageCircle className="h-4 w-4" />
            Start chat
          </button>
        </section>

        {/* Info cards */}
        <section className="flex-1 px-4 pb-4">
          <div className="mx-auto grid h-full max-w-5xl auto-rows-auto grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:h-auto lg:grid-cols-3">
            <InfoCard
              icon={<Pill className="h-5 w-5" />}
              emoji="💊"
              title="Medication Tips"
              body="Take your meds at the same time each day. Use a pill organiser or phone reminder to avoid missed doses."
            />
            <InfoCard
              icon={<Stethoscope className="h-5 w-5" />}
              emoji="🩺"
              title="When to See a Doctor"
              body="Don't ignore chest pain, sudden weakness, severe headaches, or breathing trouble. Trust your instincts."
            />
            <InfoCard
              icon={<CalendarCheck className="h-5 w-5" />}
              emoji="📅"
              title="Appointment Prep"
              body="Write down your top 3 questions, current medications, and how long your symptoms have lasted."
            />
          </div>
        </section>
      </div>

      {/* Floating chat bubble */}
      <button
        onClick={() => navigate({ to: "/chat" })}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-medical-blue text-primary-foreground shadow-xl shadow-medical-blue/30 transition-transform hover:scale-105 ${
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

      {/* First-time tour overlay */}
      {showTour && (
        <>
          <div
            onClick={dismissTour}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px] animate-fade-in"
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Welcome tip"
            className="fixed bottom-24 right-4 z-50 w-[min(20rem,calc(100vw-2rem))] animate-fade-in rounded-2xl bg-medical-blue p-4 text-primary-foreground shadow-2xl shadow-black/30 sm:right-6 sm:bottom-24"
          >
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Have a health question?</span>
              <br />
              Tap here to talk to ClareCare.
            </p>
            <button
              onClick={dismissTour}
              className="mt-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-white/25"
            >
              Got it
            </button>
            {/* Arrow pointing down-right toward the bubble */}
            <span
              className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 bg-medical-blue"
              aria-hidden="true"
            />
          </div>
        </>
      )}
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
    <article className="rounded-xl border border-border/70 bg-card p-3 shadow-sm transition-shadow hover:shadow-md sm:rounded-2xl sm:p-5">
      <div className="text-xl sm:text-2xl">{emoji}</div>
      <h2 className="mt-1 font-display text-sm font-semibold tracking-tight sm:mt-3 sm:text-lg">
        {title}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
        {body}
      </p>
    </article>
  );
}
