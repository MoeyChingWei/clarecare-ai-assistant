import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Stethoscope,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/clinician")({
  head: () => ({
    meta: [
      { title: "ClareCare — Clinician Dashboard" },
      {
        name: "description",
        content:
          "Live dashboard of escalated patient cases with AI-generated summaries and urgency.",
      },
      { property: "og:title", content: "ClareCare — Clinician Dashboard" },
      {
        property: "og:description",
        content: "Triaged patient cases, updated in real time.",
      },
    ],
  }),
  component: ClinicianDashboard,
});

type Urgency = "low" | "medium" | "high";
type Status = "open" | "resolved";

interface CaseRow {
  id: string;
  patient_query: string;
  symptoms: string[];
  escalation_reason: string;
  urgency: Urgency;
  case_summary: string;
  status: Status;
  created_at: string;
  resolved_at: string | null;
  patient_name: string | null;
  patient_phone: string | null;
}

const URGENCY_RANK: Record<Urgency, number> = { high: 0, medium: 1, low: 2 };

async function fetchCases(): Promise<CaseRow[]> {
  const { data, error } = await supabase
    .from("escalated_cases")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as CaseRow[];
}

function ClinicianDashboard() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status>("open");

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["escalated_cases"],
    queryFn: fetchCases,
  });

  useEffect(() => {
    const channel = supabase
      .channel("escalated_cases_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "escalated_cases" },
        () => {
          qc.invalidateQueries({ queryKey: ["escalated_cases"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const filtered = useMemo(() => {
    return cases
      .filter((c) => c.status === filter)
      .sort((a, b) => {
        if (filter === "open") {
          const u = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
          if (u !== 0) return u;
        }
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [cases, filter]);

  const counts = useMemo(() => {
    const open = cases.filter((c) => c.status === "open");
    return {
      open: open.length,
      resolved: cases.length - open.length,
      high: open.filter((c) => c.urgency === "high").length,
      medium: open.filter((c) => c.urgency === "medium").length,
      low: open.filter((c) => c.urgency === "low").length,
    };
  }, [cases]);

  const resolve = async (id: string) => {
    qc.setQueryData<CaseRow[]>(["escalated_cases"], (prev) =>
      prev?.map((c) =>
        c.id === id
          ? { ...c, status: "resolved", resolved_at: new Date().toISOString() }
          : c,
      ),
    );
    const { error } = await supabase
      .from("escalated_cases")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error(error);
      qc.invalidateQueries({ queryKey: ["escalated_cases"] });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Clinician dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Escalated patient cases, updated live.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Stat label="High" value={counts.high} tone="high" />
            <Stat label="Medium" value={counts.medium} tone="medium" />
            <Stat label="Low" value={counts.low} tone="low" />
          </div>
        </div>

        <div className="mb-4 inline-flex rounded-full border border-border/70 bg-card p-1 shadow-sm">
          {(["open", "resolved"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize transition-colors ${
                filter === s
                  ? "bg-medical-blue text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s} ({s === "open" ? counts.open : counts.resolved})
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading cases…</p>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <CaseCard key={c.id} c={c} onResolve={resolve} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CaseCard({
  c,
  onResolve,
}: {
  c: CaseRow;
  onResolve: (id: string) => void;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <UrgencyBadge urgency={c.urgency} />
        <time className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatRelative(c.created_at)}
        </time>
      </div>

      {(c.patient_name || c.patient_phone) && (
        <div className="mt-3 rounded-lg border border-border/60 bg-medical-blue-soft/40 px-3 py-2 text-xs">
          {c.patient_name && (
            <p className="font-semibold text-foreground">{c.patient_name}</p>
          )}
          {c.patient_phone && (
            <a
              href={`tel:${c.patient_phone}`}
              className="text-medical-blue underline-offset-2 hover:underline"
            >
              {c.patient_phone}
            </a>
          )}
        </div>
      )}

      <p className="mt-3 line-clamp-2 text-sm font-medium text-foreground">
        “{c.patient_query}”
      </p>

      <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-foreground">
        <p className="mb-1.5 font-semibold uppercase tracking-wide text-muted-foreground">
          AI Summary
        </p>
        <p>{c.case_summary}</p>
        {c.symptoms.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {c.symptoms.map((s) => (
              <span
                key={s}
                className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        )}
        {c.escalation_reason && (
          <p className="mt-2 text-[11px] italic text-muted-foreground">
            Reason: {c.escalation_reason}
          </p>
        )}
      </div>

      {c.status === "open" ? (
        <button
          onClick={() => onResolve(c.id)}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-medical-green px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <CheckCircle2 className="h-4 w-4" />
          Mark resolved
        </button>
      ) : (
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-medical-green" />
          Resolved {c.resolved_at ? formatRelative(c.resolved_at) : ""}
        </p>
      )}
    </article>
  );
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const map = {
    high: {
      label: "High",
      bg: "bg-urgency-high-soft",
      dot: "bg-urgency-high",
      text: "text-urgency-high",
    },
    medium: {
      label: "Medium",
      bg: "bg-urgency-medium-soft",
      dot: "bg-urgency-medium",
      text: "text-urgency-medium",
    },
    low: {
      label: "Low",
      bg: "bg-urgency-low-soft",
      dot: "bg-urgency-low",
      text: "text-urgency-low",
    },
  } as const;
  const s = map[urgency];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label} urgency
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: Urgency;
}) {
  const tones: Record<Urgency, string> = {
    high: "border-urgency-high/30 bg-urgency-high-soft text-urgency-high",
    medium:
      "border-urgency-medium/30 bg-urgency-medium-soft text-urgency-medium",
    low: "border-urgency-low/30 bg-urgency-low-soft text-urgency-low",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${tones[tone]}`}
    >
      <AlertTriangle className="h-3 w-3" />
      {value} {label}
    </span>
  );
}

function EmptyState({ filter }: { filter: Status }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/50 px-4 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-medical-blue-soft text-medical-blue">
        {filter === "open" ? (
          <Stethoscope className="h-5 w-5" />
        ) : (
          <Inbox className="h-5 w-5" />
        )}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        {filter === "open" ? "All clear" : "No resolved cases yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filter === "open"
          ? "No escalated cases right now. New cases appear here in real time."
          : "Resolved cases will be listed here once you close them out."}
      </p>
    </div>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
