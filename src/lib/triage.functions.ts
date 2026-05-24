import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
});

const SAFETY_RULES = `
SAFETY RULES (ABSOLUTE):
- You must NEVER diagnose.
- You must NEVER prescribe medication.
- You must NEVER give specific dosage instructions.
- ESCALATE: any emergency symptoms; medication dosage questions; medication interactions; allergies; pregnancy concerns; complex or worsening symptoms.
- Always remember you are not a replacement for professional medical advice.
`;

const SYSTEM_PROMPT_BASE = `You are ClareCare, a calm, empathetic healthcare triage assistant for a clinic. You speak with patients in plain, reassuring language.
${SAFETY_RULES}

For every patient message decide between:
1. SAFE_TO_ANSWER — General health questions, common medication info (purpose only — NOT dosing or interactions), lifestyle/nutrition/sleep/exercise, mild self-limiting symptoms, wellness questions.
2. ESCALATE — Anything urgent or beyond general advice (see safety rules).

When ESCALATE: the "patient_reply" MUST start with "I'm flagging this because you mentioned [X]." (replace [X] with the specific symptom). Then: "A clinician will review within 2 hours." Add one short empathetic sentence. If life-threatening, add: "If this feels like an emergency, please call 999 right now." Keep to 2-4 sentences.

When SAFE_TO_ANSWER: answer briefly and warmly, end with: "This isn't a replacement for professional medical advice."

You MUST always call the "triage" tool exactly once.`;

const TOOL = {
  name: "triage",
  description: "Record the triage decision and the reply shown to the patient.",
  input_schema: {
    type: "object",
    properties: {
      patient_reply: { type: "string" },
      decision: { type: "string", enum: ["SAFE_TO_ANSWER", "ESCALATE"] },
      urgency_level: { type: "string", enum: ["low", "medium", "high"] },
      symptoms_mentioned: { type: "array", items: { type: "string" } },
      escalation_reason: { type: "string" },
      ai_summary: { type: "string" },
    },
    required: [
      "patient_reply",
      "decision",
      "urgency_level",
      "symptoms_mentioned",
      "escalation_reason",
      "ai_summary",
    ],
  },
};

interface TriageResult {
  patient_reply: string;
  decision: "SAFE_TO_ANSWER" | "ESCALATE";
  urgency_level: "low" | "medium" | "high";
  symptoms_mentioned: string[];
  escalation_reason: string;
  ai_summary: string;
}

async function callClaude(
  messages: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string,
): Promise<TriageResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "triage" },
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Anthropic error:", res.status, text);
    throw new Error(`Anthropic API error (${res.status})`);
  }
  const json = (await res.json()) as {
    content?: Array<{ type: string; name?: string; input?: TriageResult }>;
  };
  const toolUse = json.content?.find(
    (b) => b.type === "tool_use" && b.name === "triage",
  );
  if (!toolUse?.input) throw new Error("Triage model did not return a decision");
  return toolUse.input;
}

export const triageMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    const patientQuery = lastUser?.content ?? "";
    const lowerQuery = patientQuery.toLowerCase();

    // 1. Red flag pre-check
    const { data: rules } = await supabaseAdmin
      .from("red_flag_rules")
      .select("keyword, urgency, escalation_reason")
      .eq("active", true);

    const matchedRule = rules?.find((r) =>
      lowerQuery.includes(r.keyword.toLowerCase()),
    );

    if (matchedRule) {
      const reply = `I'm flagging this because you mentioned ${matchedRule.keyword}. A clinician will review within 2 hours. If this feels like an emergency, please call 999 right now. You're not alone — help is on the way. (This isn't a replacement for professional medical advice.)`;
      const { data: inserted } = await supabaseAdmin
        .from("escalated_cases")
        .insert({
          patient_query: patientQuery,
          symptoms: [matchedRule.keyword],
          escalation_reason: matchedRule.escalation_reason,
          urgency: matchedRule.urgency,
          case_summary: `Red-flag keyword "${matchedRule.keyword}" detected in patient message. Auto-escalated by safety rules.`,
          status: "open",
        })
        .select("id")
        .single();
      return {
        reply,
        escalated: true,
        urgency: matchedRule.urgency as "low" | "medium" | "high",
        caseId: inserted?.id ?? null,
        decision: "ESCALATE" as const,
        source: "red_flag" as const,
      };
    }

    // 2. Pull approved KB to nudge Claude
    const { data: kb } = await supabaseAdmin
      .from("knowledge_base")
      .select("category, question, approved_answer")
      .eq("active", true)
      .limit(20);

    let systemPrompt = SYSTEM_PROMPT_BASE;
    if (kb && kb.length > 0) {
      const kbBlock = kb
        .map(
          (k) =>
            `- [${k.category}] Q: ${k.question}\n  Approved A: ${k.approved_answer}`,
        )
        .join("\n");
      systemPrompt += `\n\nAPPROVED KNOWLEDGE BASE — prefer these approved answers verbatim (or closely paraphrased) for matching general health questions:\n${kbBlock}`;
    }

    const result = await callClaude(
      data.messages.map((m) => ({ role: m.role, content: m.content })),
      systemPrompt,
    );

    let caseId: string | null = null;
    if (result.decision === "ESCALATE") {
      const { data: inserted, error } = await supabaseAdmin
        .from("escalated_cases")
        .insert({
          patient_query: patientQuery,
          symptoms: result.symptoms_mentioned ?? [],
          escalation_reason: result.escalation_reason || "Escalated by triage",
          urgency: result.urgency_level,
          case_summary: result.ai_summary || result.escalation_reason || "",
          status: "open",
        })
        .select("id")
        .single();
      if (error) console.error("Failed to insert case:", error);
      else caseId = inserted.id;
    }

    return {
      reply: result.patient_reply,
      escalated: result.decision === "ESCALATE",
      urgency: result.urgency_level,
      caseId,
      decision: result.decision,
      source: "claude" as const,
    };
  });

const ReviewInputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
});

export const requestHumanReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ReviewInputSchema.parse(input))
  .handler(async ({ data }) => {
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    const patientQuery = lastUser?.content ?? "(no message)";
    const transcript = data.messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Patient" : "ClareCare"}: ${m.content}`)
      .join("\n");

    const { data: inserted, error } = await supabaseAdmin
      .from("escalated_cases")
      .insert({
        patient_query: patientQuery,
        symptoms: [],
        escalation_reason: "Patient requested human review",
        urgency: "low",
        case_summary: `Patient explicitly requested to speak with a clinician.\n\nRecent conversation:\n${transcript}`,
        status: "open",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to insert review request:", error);
      throw new Error("Could not submit review request");
    }
    return { caseId: inserted.id };
  });

// ---------- Test runner ----------

const RunTestInput = z.object({ testCaseId: z.string().uuid() });

export const runTestCase = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RunTestInput.parse(input))
  .handler(async ({ data }) => {
    const { data: tc, error: tcErr } = await supabaseAdmin
      .from("test_cases")
      .select("*")
      .eq("id", data.testCaseId)
      .single();
    if (tcErr || !tc) throw new Error("Test case not found");

    const lowerQuery = tc.patient_query.toLowerCase();
    const { data: rules } = await supabaseAdmin
      .from("red_flag_rules")
      .select("keyword, urgency")
      .eq("active", true);
    const matchedRule = rules?.find((r) =>
      lowerQuery.includes(r.keyword.toLowerCase()),
    );

    let actualDecision: "SAFE_TO_ANSWER" | "ESCALATE";
    let actualUrgency: "low" | "medium" | "high";

    if (matchedRule) {
      actualDecision = "ESCALATE";
      actualUrgency = matchedRule.urgency as "low" | "medium" | "high";
    } else {
      const result = await callClaude(
        [{ role: "user", content: tc.patient_query }],
        SYSTEM_PROMPT_BASE,
      );
      actualDecision = result.decision;
      actualUrgency = result.urgency_level;
    }

    const passed =
      actualDecision === tc.expected_decision &&
      actualUrgency === tc.expected_urgency;
    const lastResult = passed ? "pass" : "fail";

    await supabaseAdmin
      .from("test_cases")
      .update({
        last_result: lastResult,
        last_actual_decision: actualDecision,
        last_actual_urgency: actualUrgency,
        last_run_at: new Date().toISOString(),
      })
      .eq("id", tc.id);

    return { passed, actualDecision, actualUrgency };
  });
