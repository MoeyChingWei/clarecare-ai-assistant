import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Inbox,
  LogOut,
  Stethoscope,
  ChevronLeft,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { LiveChatPanel } from "@/components/LiveChatPanel";
import { supabase } from "@/integrations/supabase/client";
import { loadSession, clearSession } from "@/lib/session";

export const Route = createFileRoute("/clinician")({
  head: () => ({
    meta: [
      { title: "ClareCare — Clinician Dashboard" },
      {
        name: "description",
        content:
          "Live dashboard of your assigned patients with AI summaries and direct chat.",
      },
    ],
  }),
  component: ClinicianDashboard,
});

type Urgency = "low" | "medium" | "high";

interface CaseRow {
  id: string;
  patient_query: string;
  symptoms: string[];
  escalation_reason: string;
  urgency: Urgency;
  case_summary: string;
  status: "open" | "resolved";
  created_at: string;
  patient_name: string | null;
  patient_phone: string | null;
}

interface AssignmentRow {
  id: string;
  patient_name: string | null;
  patient_phone: string | null;
  doctor_id: string;
  escalated_case_id: string | null;
  status: "active" | "resolved";
  created_at: string;
  case?: CaseRow | null;
}

interface DoctorSession {
  id: string;
  username: string;
  full_name: string;
}

function ClinicianDashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorSession | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "resolved">("active");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const session = loadSession();
    if (!session) {
      navigate({ to: "/login", search: { reason: "auth" } });
      return;
    }
    if (!["doctor", "admin", "superadmin"].includes(session.role)) {
      navigate({ to: "/login", search: { reason: "auth" } });
      return;
    }
    // Resolve doctor_accounts row by username so assignments + online flag
    // continue to key off doctor_accounts.id.
    void supabase
      .from("doctor_accounts")
      .select("id, username, full_name")
      .eq("username", session.username)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDoctor({
            id: data.id,
            username: data.username,
            full_name: data.full_name,
          });
        } else {
          // Admin/superadmin without a doctor profile — show empty state.
          setDoctor({
            id: "",
            username: session.username,
            full_name: session.fullName,
          });
        }
      });
  }, [navigate]);

  // Mark online while session active; offline on unmount
  useEffect(() => {
    if (!doctor || !doctor.id) return;
    supabase
      .from("doctor_accounts")
      .update({ is_online: true })
      .eq("id", doctor.id)
      .then(() => {});

    const handleUnload = () => {
      navigator.sendBeacon?.("/");
      void supabase
        .from("doctor_accounts")
        .update({ is_online: false })
        .eq("id", doctor.id);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [doctor]);

  const signOut = async () => {
    if (doctor && doctor.id) {
      await supabase
        .from("doctor_accounts")
        .update({ is_online: false })
        .eq("id", doctor.id);
    }
    clearSession();
    navigate({ to: "/login" });
  };

  const { data: assignments = [], isLoading } = useQuery({
    enabled: !!doctor && !!doctor.id,
    queryKey: ["my_assignments", doctor?.id],
    queryFn: async (): Promise<AssignmentRow[]> => {
      const { data: rows, error } = await supabase
        .from("doctor_patient_assignments")
        .select("*")
        .eq("doctor_id", doctor!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const list = (rows ?? []) as AssignmentRow[];

      const caseIds = Array.from(
        new Set(list.map((a) => a.escalated_case_id).filter(Boolean) as string[]),
      );
      if (caseIds.length === 0) return list;
      const { data: cases } = await supabase
        .from("escalated_cases")
        .select("*")
        .in("id", caseIds);
      const map = new Map((cases ?? []).map((c) => [c.id as string, c as CaseRow]));
      return list.map((a) => ({
        ...a,
        case: a.escalated_case_id ? map.get(a.escalated_case_id) ?? null : null,
      }));
    },
  });

  useEffect(() => {
    if (!doctor) return;
    const channel = supabase
      .channel(`my_assignments_${doctor.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "doctor_patient_assignments" },
        () => {
          qc.invalidateQueries({ queryKey: ["my_assignments", doctor.id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "escalated_cases" },
        () => {
          qc.invalidateQueries({ queryKey: ["my_assignments", doctor.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctor, qc]);

  const filtered = useMemo(
    () => assignments.filter((a) => a.status === filter),
    [assignments, filter],
  );

  const counts = useMemo(
    () => ({
      active: assignments.filter((a) => a.status === "active").length,
      resolved: assignments.filter((a) => a.status === "resolved").length,
    }),
    [assignments],
  );

  // Auto-select first active assignment
  useEffect(() => {
    if (!selectedId && filtered.length > 0 && filter === "active") {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId, filter]);

  const selected = filtered.find((a) => a.id === selectedId) ?? null;

  const resolve = async (assignment: AssignmentRow) => {
    const now = new Date().toISOString();
    await supabase
      .from("doctor_patient_assignments")
      .update({ status: "resolved" })
      .eq("id", assignment.id);
    if (assignment.escalated_case_id) {
      await supabase
        .from("escalated_cases")
        .update({ status: "resolved", resolved_at: now })
        .eq("id", assignment.escalated_case_id);
    }
    if (doctor) {
      // Decrement active patient count (best effort)
      const { data: doc } = await supabase
        .from("doctor_accounts")
        .select("active_patients")
        .eq("id", doctor.id)
        .single();
      if (doc && (doc.active_patients ?? 0) > 0) {
        await supabase
          .from("doctor_accounts")
          .update({ active_patients: doc.active_patients - 1 })
          .eq("id", doctor.id);
      }
    }
    qc.invalidateQueries({ queryKey: ["my_assignments", doctor?.id] });
    setSelectedId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              My patients
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live conversations with patients assigned to you.
            </p>
          </div>

          {doctor && (
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-foreground">
                Dr. {doctor.full_name}
              </span>
              <button
                onClick={signOut}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-3 w-3" />
                Sign Out
              </button>
            </div>
          )}
        </div>

        <div className="mb-4 inline-flex rounded-full border border-border/70 bg-card p-1 shadow-sm">
          {(["active", "resolved"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setFilter(s);
                setSelectedId(null);
              }}
              className={`rounded-full px-4 py-1.5 text-sm capitalize transition-colors ${
                filter === s
                  ? "bg-medical-blue text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s} ({counts[s]})
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[20rem,1fr]">
            {/* Left: patient list */}
            <aside
              className={`space-y-2 ${
                selected ? "hidden lg:block" : "block"
              }`}
            >
              {filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`block w-full rounded-2xl border p-4 text-left shadow-sm transition-colors ${
                    selectedId === a.id
                      ? "border-medical-blue bg-medical-blue-soft/40"
                      : "border-border/70 bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {a.patient_name ?? "Patient"}
                    </p>
                    {a.case && <UrgencyDot urgency={a.case.urgency} />}
                  </div>
                  {a.patient_phone && (
                    <p className="truncate text-xs text-muted-foreground">
                      {a.patient_phone}
                    </p>
                  )}
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRelative(a.created_at)}
                  </p>
                </button>
              ))}
            </aside>

            {/* Right: detail */}
            <section className={selected ? "block" : "hidden lg:block"}>
              {selected ? (
                <DetailPanel
                  assignment={selected}
                  doctorName={doctor?.full_name ?? ""}
                  onBack={() => setSelectedId(null)}
                  onResolve={() => resolve(selected)}
                />
              ) : (
                <div className="grid h-full place-items-center rounded-2xl border border-dashed border-border bg-card/50 p-10 text-sm text-muted-foreground">
                  Select a patient to start chatting.
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailPanel({
  assignment,
  doctorName,
  onBack,
  onResolve,
}: {
  assignment: AssignmentRow;
  doctorName: string;
  onBack: () => void;
  onResolve: () => void;
}) {
  const c = assignment.case;
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted lg:hidden"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {assignment.patient_name ?? "Patient"}
            </h2>
            {assignment.patient_phone && (
              <a
                href={`tel:${assignment.patient_phone}`}
                className="text-xs text-medical-blue underline-offset-2 hover:underline"
              >
                {assignment.patient_phone}
              </a>
            )}
          </div>
        </div>
        {assignment.status === "active" ? (
          <button
            onClick={onResolve}
            className="inline-flex items-center gap-1.5 rounded-xl bg-medical-green px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark resolved
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-medical-green" />
            Resolved
          </span>
        )}
      </header>

      {c && (
        <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-xs leading-relaxed">
          <div className="mb-1 flex items-center gap-2">
            <p className="font-semibold uppercase tracking-wide text-muted-foreground">
              AI Summary
            </p>
            <UrgencyBadge urgency={c.urgency} />
          </div>
          <p className="text-foreground">{c.case_summary}</p>
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
          <div className="mt-3 border-t border-border/60 pt-2">
            <p className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">
              Patient's original message
            </p>
            <p className="whitespace-pre-wrap text-foreground/90">
              "{c.patient_query}"
            </p>
          </div>
          {c.escalation_reason && (
            <p className="mt-2 text-[11px] italic text-muted-foreground">
              Reason: {c.escalation_reason}
            </p>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live chat with patient
        </p>
        <LiveChatPanel
          assignmentId={assignment.id}
          selfRole="doctor"
          doctorName={doctorName}
          variant="doctor"
          heightClass="max-h-[24rem]"
        />
      </div>
    </article>
  );
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const map = {
    high: { label: "High", bg: "bg-urgency-high-soft", text: "text-urgency-high" },
    medium: {
      label: "Medium",
      bg: "bg-urgency-medium-soft",
      text: "text-urgency-medium",
    },
    low: { label: "Low", bg: "bg-urgency-low-soft", text: "text-urgency-low" },
  } as const;
  const s = map[urgency];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${s.bg} ${s.text}`}
    >
      {s.label} urgency
    </span>
  );
}

function UrgencyDot({ urgency }: { urgency: Urgency }) {
  const cls = {
    high: "bg-urgency-high",
    medium: "bg-urgency-medium",
    low: "bg-urgency-low",
  }[urgency];
  return <span className={`h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

function EmptyState({ filter }: { filter: "active" | "resolved" }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/50 px-4 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-medical-blue-soft text-medical-blue">
        {filter === "active" ? (
          <Stethoscope className="h-5 w-5" />
        ) : (
          <Inbox className="h-5 w-5" />
        )}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        {filter === "active" ? "No assigned patients yet" : "No resolved cases yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filter === "active"
          ? "Patients who select you (or are auto-assigned) will appear here in real time."
          : "Resolved patients will be listed here once you close them out."}
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
