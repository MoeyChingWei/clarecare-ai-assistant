import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signToken } from "./auth-token.server";
import { logAudit } from "./audit.server";

const LoginSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
});

export const loginUser = createServerFn({ method: "POST" })
  .inputValidator((d) => LoginSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: user, error } = await supabaseAdmin
      .from("user_accounts")
      .select("id, full_name, username, email, role, status, password_hash")
      .eq("username", data.username.trim())
      .maybeSingle();
    if (error) throw new Error("Login failed");
    if (!user) return { ok: false as const, error: "Invalid username or password" };
    if (user.status !== "active") return { ok: false as const, error: "Account is inactive" };

    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) return { ok: false as const, error: "Invalid username or password" };

    await supabaseAdmin
      .from("user_accounts")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);

    const token = signToken({ userId: user.id, role: user.role });

    await logAudit({
      actorUserId: user.id,
      actorRole: user.role,
      action: "user_login",
      entityType: "user_accounts",
      entityId: user.id,
    });

    return {
      ok: true as const,
      user: {
        userId: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role as "superadmin" | "admin" | "doctor" | "patient",
        token,
      },
    };
  });
