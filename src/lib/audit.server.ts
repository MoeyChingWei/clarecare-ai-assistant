import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function logAudit(input: {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
}) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: input.actorUserId ?? null,
      actor_role: input.actorRole ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      details: input.details ?? null,
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
