import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { loginUser } from "@/lib/auth.functions";
import { saveSession } from "@/lib/session";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "ClareCare — Admin Login" },
      { name: "description", content: "Admin and superadmin access only." },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useServerFn(loginUser);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login({ data: { username: username.trim(), password } });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      if (res.user.role !== "superadmin" && res.user.role !== "admin") {
        setError("This portal is for admin accounts only.");
        setLoading(false);
        return;
      }
      saveSession({
        userId: res.user.userId,
        fullName: res.user.fullName,
        username: res.user.username,
        email: res.user.email,
        role: res.user.role,
        token: res.user.token,
        loginAt: new Date().toISOString(),
      });
      navigate({ to: "/admin" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-gradient-to-b from-medical-blue-soft/40 via-background to-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-purple-600 text-white shadow-lg">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Admin Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Authorised access only</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <label className="block text-sm font-medium">
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
          <label className="mt-4 block text-sm font-medium">
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
            <p className="mt-3 rounded-md bg-urgency-high-soft px-3 py-2 text-xs text-urgency-high">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-900">
          Demo superadmin: <code className="font-mono">superadmin / Admin123!</code> — change before deployment.
        </p>
      </div>
    </div>
  );
}
