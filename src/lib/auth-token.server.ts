import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SESSION_SECRET || "clarecare-dev-secret";
  return s;
}

export interface TokenPayload {
  userId: string;
  role: string;
  exp: number;
}

export function signToken(payload: Omit<TokenPayload, "exp">, ttlSeconds = 60 * 60 * 12): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = JSON.stringify({ ...payload, exp });
  const b64 = Buffer.from(body).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [b64, sig] = token.split(".");
  const expected = createHmac("sha256", getSecret()).update(b64).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(b64, "base64url").toString()) as TokenPayload;
    if (!parsed?.userId || !parsed?.role || !parsed?.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function requireRole(token: string, allowed: string[]): TokenPayload {
  const p = verifyToken(token);
  if (!p) throw new Error("Unauthorized: invalid session");
  if (!allowed.includes(p.role)) throw new Error("Forbidden: insufficient role");
  return p;
}
