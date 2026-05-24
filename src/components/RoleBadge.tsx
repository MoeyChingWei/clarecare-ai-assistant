import type { UserRole } from "@/lib/session";

const ROLE_STYLES: Record<UserRole, string> = {
  superadmin: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-blue-100 text-blue-800 border-blue-200",
  doctor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  patient: "bg-gray-100 text-gray-700 border-gray-200",
};

export function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_STYLES[role as UserRole] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {role}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const ok = status === "active";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        ok
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : "bg-red-100 text-red-800 border-red-200"
      }`}
    >
      {ok ? "Active" : "Inactive"}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    urgent: "bg-red-100 text-red-800 border-red-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${map[priority] ?? map.low}`}>
      {priority}
    </span>
  );
}

export function FeedbackStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 border-blue-200",
    reviewed: "bg-indigo-100 text-indigo-800 border-indigo-200",
    in_progress: "bg-amber-100 text-amber-800 border-amber-200",
    resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dismissed: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${map[status] ?? map.new}`}>
      {status.replace("_", " ")}
    </span>
  );
}
