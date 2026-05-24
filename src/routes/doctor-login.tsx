import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/doctor-login")({
  head: () => ({
    meta: [
      { title: "ClareCare — Clinician Portal" },
      { name: "description", content: "Authorised access only." },
    ],
  }),
  component: DoctorLoginPage,
});

export const DOCTOR_SESSION_KEY = "clarecare_doctor_session";

function DoctorLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: dbErr } = await supabase
        .from("doctor_accounts")
        .select("id, username, full_name, password_hash")
        .eq("username", username.trim())
        .maybeSingle();

      if (dbErr || !data || data.password_hash !== password) {
        setError("Invalid username or password. Please try again.");
        setLoading(false);
        return;
      }

      localStorage.setItem(
        DOCTOR_SESSION_KEY,
        JSON.stringify({
          id: data.id,
          username: data.username,
          full_name: data.full_name,
          signed_in_at: new Date().toISOString(),
        }),
      );
      navigate({ to: "/clinician" });
    } catch {
      setError("Invalid username or password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-gradient-to-b from-medical-blue-soft/40 via-background to-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-medical-blue text-primary-foreground shadow-lg shadow-medical-blue/20">
            <Stethoscope className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Clinician Portal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Authorised access only
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
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

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Not registered yet? Request access from your clinic administrator.
        </p>
      </div>
    </div>
  );
}
