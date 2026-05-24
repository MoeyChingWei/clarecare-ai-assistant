// Client-side session helpers
export const SESSION_KEY = "clarecare_user_session";

export type UserRole = "superadmin" | "admin" | "doctor" | "patient";

export interface UserSession {
  userId: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  token: string;
  loginAt: string;
}

export function loadSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as UserSession;
    if (!s?.userId || !s?.role || !s?.token) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveSession(s: UserSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function hasRole(s: UserSession | null, roles: UserRole[]): boolean {
  return !!s && roles.includes(s.role);
}
