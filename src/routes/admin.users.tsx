import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, KeyRound, Power } from "lucide-react";
import { loadSession } from "@/lib/session";
import { listUsers, createUser, updateUser, deactivateUser, resetUserPassword } from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleBadge, StatusBadge } from "@/components/RoleBadge";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

interface Row {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
}

function UsersPage() {
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const update = useServerFn(updateUser);
  const toggle = useServerFn(deactivateUser);
  const reset = useServerFn(resetUserPassword);

  const session = typeof window !== "undefined" ? loadSession() : null;
  const isSuperadmin = session?.role === "superadmin";

  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [resetting, setResetting] = useState<Row | null>(null);
  const [error, setError] = useState("");

  const reload = async () => {
    if (!session) return;
    try {
      const res = await list({ data: { token: session.token } });
      setRows(res.users as Row[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        r.full_name.toLowerCase().includes(s) ||
        r.username.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        r.role.toLowerCase().includes(s)
      );
    });
  }, [rows, search, roleFilter, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage admins, doctors, and patient accounts.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New user
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, username, email, role…" className="pl-8" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
          <option value="all">All roles</option>
          <option value="superadmin">Superadmin</option>
          <option value="admin">Admin</option>
          <option value="doctor">Doctor</option>
          <option value="patient">Patient</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && <p className="rounded-md bg-urgency-high-soft px-3 py-2 text-xs text-urgency-high">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Full name</th>
              <th className="px-4 py-2 text-left">Username</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-left">Last login</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const lockedBecauseSuper = r.role === "superadmin" && !isSuperadmin;
              return (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-4 py-2 font-medium">{r.full_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.username}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-2"><RoleBadge role={r.role} /></td>
                  <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.last_login_at ? new Date(r.last_login_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button disabled={lockedBecauseSuper} onClick={() => setEditing(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                      <button disabled={lockedBecauseSuper} onClick={() => setResetting(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" aria-label="Reset password"><KeyRound className="h-3.5 w-3.5" /></button>
                      <button
                        disabled={r.role === "superadmin"}
                        onClick={async () => {
                          if (!session) return;
                          await toggle({ data: { token: session.token, id: r.id, active: r.status !== "active" } });
                          void reload();
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        aria-label="Toggle status"
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-muted-foreground">No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <CreateUserModal
          isSuperadmin={isSuperadmin}
          onClose={() => setCreateOpen(false)}
          onCreate={async (form) => {
            if (!session) return;
            await create({ data: { token: session.token, ...form } });
            setCreateOpen(false);
            void reload();
          }}
        />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          isSuperadmin={isSuperadmin}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            if (!session) return;
            await update({ data: { token: session.token, id: editing.id, ...form } });
            setEditing(null);
            void reload();
          }}
        />
      )}

      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
          onSave={async (newPassword) => {
            if (!session) return;
            await reset({ data: { token: session.token, id: resetting.id, newPassword } });
            setResetting(null);
          }}
        />
      )}
    </div>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateUserModal({ onClose, onCreate, isSuperadmin }: { onClose: () => void; onCreate: (f: { fullName: string; username: string; email: string; password: string; role: "admin" | "doctor" | "patient"; status: "active" | "inactive" }) => Promise<void>; isSuperadmin: boolean }) {
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "", confirm: "", role: "doctor" as "admin" | "doctor" | "patient", status: "active" as "active" | "inactive" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell title="Create user" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          if (form.password !== form.confirm) { setErr("Passwords don't match"); return; }
          if (form.password.length < 8) { setErr("Password must be at least 8 characters"); return; }
          setBusy(true);
          try {
            await onCreate({ fullName: form.fullName, username: form.username, email: form.email, password: form.password, role: form.role, status: form.status });
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed");
          } finally { setBusy(false); }
        }}
        className="space-y-3"
      >
        <div><Label className="text-xs">Full name</Label><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
        <div><Label className="text-xs">Username</Label><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
        <div><Label className="text-xs">Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Password</Label><Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div><Label className="text-xs">Confirm</Label><Input type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Role</Label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as never })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
              {isSuperadmin && <option value="admin">Admin</option>}
              <option value="doctor">Doctor</option>
              <option value="patient">Patient</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as never })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {err && <p className="rounded-md bg-urgency-high-soft px-3 py-2 text-xs text-urgency-high">{err}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating…" : "Create user"}</Button>
      </form>
    </ModalShell>
  );
}

function EditUserModal({ user, onClose, onSave, isSuperadmin }: { user: Row; onClose: () => void; onSave: (f: { fullName: string; username: string; email: string; role: "admin" | "doctor" | "patient"; status: "active" | "inactive" }) => Promise<void>; isSuperadmin: boolean }) {
  const [form, setForm] = useState({ fullName: user.full_name, username: user.username, email: user.email, role: (user.role === "superadmin" ? "admin" : user.role) as "admin" | "doctor" | "patient", status: user.status as "active" | "inactive" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell title="Edit user" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(""); setBusy(true);
          try { await onSave(form); } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
        }}
        className="space-y-3"
      >
        <div><Label className="text-xs">Full name</Label><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
        <div><Label className="text-xs">Username</Label><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
        <div><Label className="text-xs">Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Role</Label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as never })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
              {isSuperadmin && <option value="admin">Admin</option>}
              <option value="doctor">Doctor</option>
              <option value="patient">Patient</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as never })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {err && <p className="rounded-md bg-urgency-high-soft px-3 py-2 text-xs text-urgency-high">{err}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : "Save changes"}</Button>
      </form>
    </ModalShell>
  );
}

function ResetPasswordModal({ user, onClose, onSave }: { user: Row; onClose: () => void; onSave: (pw: string) => Promise<void> }) {
  const [pw, setPw] = useState(""); const [confirm, setConfirm] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  return (
    <ModalShell title={`Reset password — ${user.username}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault(); setErr("");
          if (pw !== confirm) { setErr("Passwords don't match"); return; }
          if (pw.length < 8) { setErr("Password must be at least 8 characters"); return; }
          setBusy(true);
          try { await onSave(pw); } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
        }}
        className="space-y-3"
      >
        <div><Label className="text-xs">New password</Label><Input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div><Label className="text-xs">Confirm</Label><Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        {err && <p className="rounded-md bg-urgency-high-soft px-3 py-2 text-xs text-urgency-high">{err}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Resetting…" : "Reset password"}</Button>
      </form>
    </ModalShell>
  );
}
