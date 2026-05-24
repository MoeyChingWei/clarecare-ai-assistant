import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireRole } from "./auth-token.server";
import { logAudit } from "./audit.server";

const RoleEnum = z.enum(["superadmin", "admin", "doctor", "patient"]);
const StatusEnum = z.enum(["active", "inactive"]);

/**
 * Mirror an active doctor from user_accounts into doctor_accounts so they
 * appear in the patient chat picker. Keyed by username.
 */
async function syncDoctorAccount(args: {
  username: string;
  fullName: string;
  previousUsername?: string;
}) {
  const { username, fullName, previousUsername } = args;

  // If username changed, rename existing row.
  if (previousUsername && previousUsername !== username) {
    const { data: oldRow } = await supabaseAdmin
      .from("doctor_accounts")
      .select("id")
      .eq("username", previousUsername)
      .maybeSingle();
    if (oldRow) {
      await supabaseAdmin
        .from("doctor_accounts")
        .update({ username, full_name: fullName })
        .eq("id", oldRow.id);
      return;
    }
  }

  const { data: existing } = await supabaseAdmin
    .from("doctor_accounts")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("doctor_accounts")
      .update({ full_name: fullName })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("doctor_accounts").insert({
      username,
      full_name: fullName,
      password_hash: "",
      is_online: false,
      active_patients: 0,
    });
  }
}


export const listUsers = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireRole(data.token, ["superadmin", "admin"]);
    const { data: rows, error } = await supabaseAdmin
      .from("user_accounts")
      .select("id, full_name, username, email, role, status, created_at, last_login_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { users: rows ?? [] };
  });

export const createUser = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: z.string(),
      fullName: z.string().min(1).max(120),
      username: z.string().min(3).max(60).regex(/^[a-zA-Z0-9_.-]+$/),
      email: z.string().email().max(255),
      password: z.string().min(8).max(128),
      role: RoleEnum,
      status: StatusEnum.default("active"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const caller = requireRole(data.token, ["superadmin", "admin"]);
    if (data.role === "superadmin") throw new Error("Cannot create superadmin");
    if (data.role === "admin" && caller.role !== "superadmin") {
      throw new Error("Only superadmin can create admin accounts");
    }
    const password_hash = await bcrypt.hash(data.password, 10);
    const { data: created, error } = await supabaseAdmin
      .from("user_accounts")
      .insert({
        full_name: data.fullName,
        username: data.username,
        email: data.email,
        password_hash,
        role: data.role,
        status: data.status,
        created_by: caller.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.role === "doctor" && data.status === "active") {
      await syncDoctorAccount({ username: data.username, fullName: data.fullName });
    }
    await logAudit({
      actorUserId: caller.userId,
      actorRole: caller.role,
      action: "admin_create_user",
      entityType: "user_accounts",
      entityId: created.id,
      details: `${data.role}/${data.username}`,
    });
    return { ok: true, id: created.id };
  });


export const updateUser = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: z.string(),
      id: z.string().uuid(),
      fullName: z.string().min(1).max(120),
      username: z.string().min(3).max(60),
      email: z.string().email(),
      role: RoleEnum,
      status: StatusEnum,
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const caller = requireRole(data.token, ["superadmin", "admin"]);
    const { data: target } = await supabaseAdmin
      .from("user_accounts")
      .select("role, username")
      .eq("id", data.id)
      .maybeSingle();
    if (!target) throw new Error("User not found");
    if (target.role === "superadmin" && caller.role !== "superadmin") {
      throw new Error("Cannot modify superadmin");
    }
    if (data.role === "admin" && caller.role !== "superadmin") {
      throw new Error("Only superadmin can assign admin role");
    }
    if (data.role === "superadmin") throw new Error("Cannot assign superadmin role");

    const { error } = await supabaseAdmin
      .from("user_accounts")
      .update({
        full_name: data.fullName,
        username: data.username,
        email: data.email,
        role: data.role,
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.role === "doctor" && data.status === "active") {
      await syncDoctorAccount({
        username: data.username,
        fullName: data.fullName,
        previousUsername: target.username,
      });
    } else if (target.role === "doctor") {
      // Role changed away from doctor or user deactivated → mark offline
      await supabaseAdmin
        .from("doctor_accounts")
        .update({ is_online: false })
        .eq("username", target.username);
    }

    await logAudit({
      actorUserId: caller.userId,
      actorRole: caller.role,
      action: "admin_update_user",
      entityType: "user_accounts",
      entityId: data.id,
    });
    return { ok: true };
  });


export const deactivateUser = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: z.string(),
      id: z.string().uuid(),
      active: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const caller = requireRole(data.token, ["superadmin", "admin"]);
    const { data: target } = await supabaseAdmin
      .from("user_accounts")
      .select("role")
      .eq("id", data.id)
      .maybeSingle();
    if (!target) throw new Error("User not found");
    if (target.role === "superadmin") throw new Error("Cannot modify superadmin status");
    const { error } = await supabaseAdmin
      .from("user_accounts")
      .update({ status: data.active ? "active" : "inactive", updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Mirror to doctor_accounts when applicable.
    const { data: refreshed } = await supabaseAdmin
      .from("user_accounts")
      .select("role, username, full_name")
      .eq("id", data.id)
      .maybeSingle();
    if (refreshed?.role === "doctor") {
      if (data.active) {
        await syncDoctorAccount({ username: refreshed.username, fullName: refreshed.full_name });
      } else {
        await supabaseAdmin
          .from("doctor_accounts")
          .update({ is_online: false })
          .eq("username", refreshed.username);
      }
    }

    await logAudit({
      actorUserId: caller.userId,
      actorRole: caller.role,
      action: data.active ? "admin_reactivate_user" : "admin_deactivate_user",
      entityType: "user_accounts",
      entityId: data.id,
    });
    return { ok: true };
  });


export const resetUserPassword = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: z.string(),
      id: z.string().uuid(),
      newPassword: z.string().min(8).max(128),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const caller = requireRole(data.token, ["superadmin", "admin"]);
    const { data: target } = await supabaseAdmin
      .from("user_accounts")
      .select("role")
      .eq("id", data.id)
      .maybeSingle();
    if (!target) throw new Error("User not found");
    if (target.role === "superadmin" && caller.role !== "superadmin") {
      throw new Error("Cannot reset superadmin password");
    }
    const password_hash = await bcrypt.hash(data.newPassword, 10);
    const { error } = await supabaseAdmin
      .from("user_accounts")
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({
      actorUserId: caller.userId,
      actorRole: caller.role,
      action: "admin_reset_password",
      entityType: "user_accounts",
      entityId: data.id,
    });
    return { ok: true };
  });
