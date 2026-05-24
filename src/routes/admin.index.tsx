import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Users, Stethoscope, MessageSquare, AlertTriangle, ClipboardList, CheckCircle2 } from "lucide-react";
import { getAdminDashboard } from "@/lib/feedback.functions";
import { loadSession } from "@/lib/session";
import { PriorityBadge, FeedbackStatusBadge } from "@/components/RoleBadge";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const fn = useServerFn(getAdminDashboard);
  const [data, setData] = useState<Awaited<ReturnType<typeof fn>> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const s = loadSession();
    if (!s) return;
    fn({ data: { token: s.token } })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [fn]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const cards = [
    { label: "Total Users", value: data.totalUsers, icon: Users, tone: "bg-blue-50 text-blue-700" },
    { label: "Active Doctors", value: data.activeDoctors, icon: Stethoscope, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Open Feedback", value: data.openFeedback, icon: MessageSquare, tone: "bg-indigo-50 text-indigo-700" },
    { label: "High-Priority Feedback", value: data.highPriorityFeedback, icon: AlertTriangle, tone: "bg-orange-50 text-orange-700" },
    { label: "Open Escalated Cases", value: data.openCases, icon: ClipboardList, tone: "bg-amber-50 text-amber-700" },
    { label: "AI Test Pass Rate", value: data.aiPassRate === null ? "—" : `${data.aiPassRate}%`, icon: CheckCircle2, tone: "bg-medical-green-soft text-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of ClareCare safety, users, and activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{c.value}</p>
              </div>
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${c.tone}`}>
                <c.icon className="h-4 w-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Recent feedback</h2>
          <ul className="space-y-2">
            {data.recentFeedback.length === 0 && <p className="text-xs text-muted-foreground">No feedback yet.</p>}
            {data.recentFeedback.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.title}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{f.submitted_by_role ?? "—"} · {new Date(f.created_at).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <PriorityBadge priority={f.priority} />
                  <FeedbackStatusBadge status={f.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Recent escalated cases</h2>
          <ul className="space-y-2">
            {data.recentCases.length === 0 && <p className="text-xs text-muted-foreground">No cases yet.</p>}
            {data.recentCases.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm">{c.patient_query}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize">{c.urgency}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-medical-blue-soft/40 p-4 text-xs text-foreground">
        <strong>Safety reminder:</strong> ClareCare does not diagnose, prescribe, or provide medication dosage. Urgent, unclear, or medication-risk cases must be escalated.
      </div>
    </div>
  );
}
