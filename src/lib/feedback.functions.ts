import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireRole, verifyToken } from "./auth-token.server";
import { logAudit } from "./audit.server";
import { sendEmail, getEmailConfig } from "./email.server";

const FeedbackTypeEnum = z.enum([
  "system_bug",
  "ai_response_issue",
  "safety_concern",
  "dashboard_improvement",
  "user_experience",
  "other",
]);
const PriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
const StatusEnum = z.enum(["new", "reviewed", "in_progress", "resolved", "dismissed"]);

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: z.string().optional(),
      submittedByName: z.string().max(120).optional(),
      submittedByEmail: z.string().email().max(255).optional().or(z.literal("")),
      feedbackType: FeedbackTypeEnum,
      priority: PriorityEnum.default("medium"),
      title: z.string().min(1).max(200),
      message: z.string().min(1).max(4000),
      relatedCaseId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    let actorUserId: string | null = null;
    let actorRole: string | null = null;
    let submittedByName: string | null = data.submittedByName ?? null;
    let submittedByEmail: string | null = data.submittedByEmail || null;

    if (data.token) {
      const claims = verifyToken(data.token);
      if (claims) {
        actorUserId = claims.userId;
        actorRole = claims.role;
        const { data: u } = await supabaseAdmin
          .from("user_accounts")
          .select("full_name, email")
          .eq("id", claims.userId)
          .maybeSingle();
        if (u) {
          submittedByName = submittedByName ?? u.full_name;
          submittedByEmail = submittedByEmail ?? u.email;
        }
      }
    }

    const { data: row, error } = await supabaseAdmin
      .from("feedback_notifications")
      .insert({
        submitted_by_user_id: actorUserId,
        submitted_by_name: submittedByName,
        submitted_by_role: actorRole ?? "patient",
        submitted_by_email: submittedByEmail,
        feedback_type: data.feedbackType,
        title: data.title,
        message: data.message,
        priority: data.priority,
        status: "new",
        related_case_id: data.relatedCaseId ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await logAudit({
      actorUserId,
      actorRole,
      action: "feedback_submitted",
      entityType: "feedback_notifications",
      entityId: row.id,
      details: `${data.feedbackType}/${data.priority}`,
    });

    // Fire-and-forget email notify
    void notifyAdmins({
      feedbackId: row.id,
      title: data.title,
      type: data.feedbackType,
      priority: data.priority,
      submittedByName,
      submittedByRole: actorRole ?? "patient",
      submittedByEmail,
      message: data.message,
    });

    return { ok: true, id: row.id };
  });

async function notifyAdmins(args: {
  feedbackId: string;
  title: string;
  type: string;
  priority: string;
  submittedByName: string | null;
  submittedByRole: string;
  submittedByEmail: string | null;
  message: string;
}) {
  const { data: admins } = await supabaseAdmin
    .from("user_accounts")
    .select("email")
    .in("role", ["admin", "superadmin"])
    .eq("status", "active");

  const recipients = (admins ?? []).map((a) => a.email).filter(Boolean);
  const subject = `[ClareCare] New Feedback Notification: ${args.priority} - ${args.title}`;
  const body = `A new feedback notification has been submitted in ClareCare.

Title: ${args.title}
Type: ${args.type}
Priority: ${args.priority}
Submitted by: ${args.submittedByName ?? "(anonymous)"}
Role: ${args.submittedByRole}
Email: ${args.submittedByEmail ?? "(none)"}

Message:
${args.message}

Please review it in the ClareCare Admin Dashboard.`;

  const cfg = getEmailConfig();
  for (const to of recipients) {
    if (!cfg.configured) {
      await supabaseAdmin.from("email_logs").insert({
        related_feedback_id: args.feedbackId,
        email_type: "feedback_notification",
        recipient_email: to,
        subject,
        status: "failed",
        error_message: "Email provider not configured",
      });
      continue;
    }
    const result = await sendEmail({ to, subject, body });
    await supabaseAdmin.from("email_logs").insert({
      related_feedback_id: args.feedbackId,
      email_type: "feedback_notification",
      recipient_email: to,
      subject,
      status: result.ok ? "sent" : "failed",
      error_message: result.ok ? null : result.error ?? "send failed",
      sent_at: result.ok ? new Date().toISOString() : null,
    });
    await logAudit({
      action: result.ok ? "email_notification_sent" : "email_notification_failed",
      entityType: "feedback_notifications",
      entityId: args.feedbackId,
      details: to,
    });
  }
}

export const listFeedback = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireRole(data.token, ["superadmin", "admin"]);
    const { data: rows, error } = await supabaseAdmin
      .from("feedback_notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { feedback: rows ?? [] };
  });

export const updateFeedbackStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: z.string(),
      id: z.string().uuid(),
      status: StatusEnum,
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const caller = requireRole(data.token, ["superadmin", "admin"]);
    const { error } = await supabaseAdmin
      .from("feedback_notifications")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({
      actorUserId: caller.userId,
      actorRole: caller.role,
      action: "feedback_status_updated",
      entityType: "feedback_notifications",
      entityId: data.id,
      details: data.status,
    });
    return { ok: true };
  });

export const addFeedbackNote = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: z.string(),
      feedbackId: z.string().uuid(),
      note: z.string().min(1).max(2000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const caller = requireRole(data.token, ["superadmin", "admin"]);
    const { error } = await supabaseAdmin.from("feedback_admin_notes").insert({
      feedback_id: data.feedbackId,
      admin_user_id: caller.userId,
      note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listFeedbackNotes = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), feedbackId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    requireRole(data.token, ["superadmin", "admin"]);
    const { data: rows, error } = await supabaseAdmin
      .from("feedback_admin_notes")
      .select("*")
      .eq("feedback_id", data.feedbackId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { notes: rows ?? [] };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), to: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    const caller = requireRole(data.token, ["superadmin", "admin"]);
    const result = await sendEmail({
      to: data.to,
      subject: "[ClareCare] Test email",
      body: "This is a test email from the ClareCare admin dashboard.",
    });
    await supabaseAdmin.from("email_logs").insert({
      email_type: "test",
      recipient_email: data.to,
      subject: "[ClareCare] Test email",
      status: result.ok ? "sent" : "failed",
      error_message: result.ok ? null : result.error ?? "send failed",
      sent_at: result.ok ? new Date().toISOString() : null,
    });
    await logAudit({
      actorUserId: caller.userId,
      actorRole: caller.role,
      action: result.ok ? "email_notification_sent" : "email_notification_failed",
      entityType: "email_logs",
      details: `test:${data.to}`,
    });
    return result;
  });

export const getEmailSettings = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireRole(data.token, ["superadmin", "admin"]);
    const cfg = getEmailConfig();
    const { count } = await supabaseAdmin
      .from("user_accounts")
      .select("id", { count: "exact", head: true })
      .in("role", ["admin", "superadmin"])
      .eq("status", "active");
    const { data: lastTest } = await supabaseAdmin
      .from("email_logs")
      .select("status, error_message, created_at")
      .eq("email_type", "test")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      provider: cfg.provider || null,
      from: cfg.from || null,
      configured: cfg.configured,
      adminRecipients: count ?? 0,
      lastTest: lastTest ?? null,
    };
  });

export const listAuditLogs = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireRole(data.token, ["superadmin", "admin"]);
    const { data: rows, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { logs: rows ?? [] };
  });

export const getAdminDashboard = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireRole(data.token, ["superadmin", "admin"]);
    const [users, doctors, feedbackOpen, feedbackHigh, casesOpen, tests] = await Promise.all([
      supabaseAdmin.from("user_accounts").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("user_accounts").select("id", { count: "exact", head: true }).eq("role", "doctor").eq("status", "active"),
      supabaseAdmin.from("feedback_notifications").select("id", { count: "exact", head: true }).in("status", ["new", "reviewed", "in_progress"]),
      supabaseAdmin.from("feedback_notifications").select("id", { count: "exact", head: true }).in("priority", ["high", "urgent"]).in("status", ["new", "reviewed", "in_progress"]),
      supabaseAdmin.from("escalated_cases").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("test_cases").select("last_result"),
    ]);

    const testRows = (tests.data ?? []) as { last_result: string | null }[];
    const ran = testRows.filter((t) => t.last_result === "pass" || t.last_result === "fail");
    const passRate = ran.length === 0 ? null : Math.round((ran.filter((t) => t.last_result === "pass").length / ran.length) * 100);

    const [recentFeedback, recentCases] = await Promise.all([
      supabaseAdmin.from("feedback_notifications").select("id, title, priority, status, created_at, submitted_by_role").order("created_at", { ascending: false }).limit(5),
      supabaseAdmin.from("escalated_cases").select("id, patient_query, urgency, status, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    return {
      totalUsers: users.count ?? 0,
      activeDoctors: doctors.count ?? 0,
      openFeedback: feedbackOpen.count ?? 0,
      highPriorityFeedback: feedbackHigh.count ?? 0,
      openCases: casesOpen.count ?? 0,
      aiPassRate: passRate,
      recentFeedback: recentFeedback.data ?? [],
      recentCases: recentCases.data ?? [],
    };
  });
