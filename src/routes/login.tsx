import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { loginUser } from "@/lib/auth.functions";
import { saveSession, loadSession, type UserRole } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    reason: typeof search.reason === "string" ? search.reason : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ClareCare Portal — Sign In" },
      { name: "description", content: "Authorised access only." },
    ],
  }),
  component: LoginPage,
});

function homeForRole(role: UserRole): "/admin" | "/clinician" | "/chat" {
  if (role === "superadmin" || role === "admin") return "/admin";
  if (role === "doctor") return "/clinician";
  return "/chat";
}

function LoginPage() {
  const navigate = useNavigate();
  const { reason } = Route.useSearch();
  const login = useServerFn(loginUser);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in, bounce to role home
  useEffect(() => {
    const s = loadSession();
    if (s) navigate({ to: homeForRole(s.role) });
  }, [navigate]);

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/" });
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login({
        data: { username: username.trim(), password },
      });
      if (!res.ok) {
        const msg =
          res.error === "Account is inactive"
            ? "Account inactive. Please contact your administrator."
            : "Invalid username or password.";
        setError(msg);
        setLoading(false);
        return;
      }

      const role = res.user.role;
      if (!["superadmin", "admin", "doctor", "patient"].includes(role)) {
        setError("Role not allowed.");
        setLoading(false);
        return;
      }

      saveSession({
        userId: res.user.userId,
        fullName: res.user.fullName,
        username: res.user.username,
        email: res.user.email,
        role,
        token: res.user.token,
        loginAt: new Date().toISOString(),
      });

      // Mark doctor online for patient-side availability
      if (role === "doctor") {
        await supabase
          .from("doctor_accounts")
          .update({ is_online: true })
          .eq("username", res.user.username);
      }

      navigate({ to: homeForRole(role) });
    } catch {
      setError("Login service unavailable. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-[100dvh] place-items-center bg-gradient-to-b from-medical-blue-soft/40 via-background to-background px-4">
      {/* Back button */}
      <button
        type="button"
        onClick={goBack}
        className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground sm:left-4 sm:top-4"
        aria-label="Back"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-medical-blue text-primary-foreground shadow-lg shadow-medical-blue/20">
            <Stethoscope className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            ClareCare Portal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Authorised access only
          </p>
        </div>

        {reason === "auth" && !error && (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Please sign in with an authorised account.
          </p>
        )}

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
        >
          <label className="block text-sm font-medium text-foreground">
            Username
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/40"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-foreground">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/40"
            />
          </label>

          {error && (
            <p className="mt-3 rounded-md bg-urgency-high-soft px-3 py-2 text-xs text-urgency-high">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-medical-blue px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-4 rounded-lg border border-border/60 bg-muted/40 p-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground/80">Demo accounts</p>
          <p className="mt-1">
            Superadmin: <code className="font-mono">superadmin / Admin123!</code>
          </p>
          <p>
            Doctor: <code className="font-mono">drsmith / demo123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
