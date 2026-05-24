import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  MessageSquare,
  Mail,
  ClipboardList,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { clearSession, loadSession } from "@/lib/session";
import { useEffect, useState } from "react";
import type { UserSession } from "@/lib/session";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/ai-safety", label: "AI Safety Control", icon: ShieldAlert },
  { to: "/admin/feedback", label: "Feedback Notifications", icon: MessageSquare },
  { to: "/admin/email", label: "Email Settings", icon: Mail },
  { to: "/admin/audit", label: "Audit Logs", icon: ClipboardList },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  const signOut = () => {
    clearSession();
    navigate({ to: "/admin-login" });
  };

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border/60 bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-4">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-medical-blue text-primary-foreground">
          <Stethoscope className="h-4 w-4" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold leading-tight">ClareCare</p>
          <p className="text-[11px] text-muted-foreground">Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {items.map((it) => {
          const active = it.exact ? path === it.to : path.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-medical-blue-soft text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>

      {session && (
        <div className="border-t border-border/60 p-3 text-xs">
          <p className="font-medium text-foreground truncate">{session.fullName}</p>
          <p className="text-muted-foreground capitalize">{session.role}</p>
          <button
            onClick={signOut}
            className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
