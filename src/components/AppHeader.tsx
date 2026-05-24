import { Link, useRouterState } from "@tanstack/react-router";
import { Stethoscope, MessagesSquare, LayoutDashboard } from "lucide-react";

export function AppHeader() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/", label: "Patient", icon: MessagesSquare },
    { to: "/clinician", label: "Clinician", icon: LayoutDashboard },
  ] as const;

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-medical-blue text-primary-foreground">
            <Stethoscope className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            ClareCare
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full border border-border/70 bg-card p-1 shadow-sm">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-medical-blue text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
