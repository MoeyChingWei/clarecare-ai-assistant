import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { FeedbackModal } from "@/components/FeedbackModal";
import { loadSession, type UserSession } from "@/lib/session";
import { MessageSquarePlus } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "ClareCare — Admin" },
      { name: "description", content: "ClareCare admin module." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<UserSession | null>(null);
  const [ready, setReady] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    const s = loadSession();
    if (!s || (s.role !== "admin" && s.role !== "superadmin")) {
      navigate({ to: "/admin-login" });
      return;
    }
    setSession(s);
    setReady(true);
  }, [navigate]);

  if (!ready || !session) {
    return <div className="grid min-h-[100dvh] place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-[100dvh] bg-gradient-to-b from-medical-blue-soft/30 via-background to-background">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/60 bg-card/60 px-6 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium">{session.fullName} <span className="ml-1 text-xs capitalize text-muted-foreground">· {session.role}</span></p>
          </div>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" /> Report issue
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} defaultRole="admin" />
    </div>
  );
}
