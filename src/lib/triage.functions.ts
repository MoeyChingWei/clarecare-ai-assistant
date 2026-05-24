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

const SYSTEM_PROMPT = `You are ClareCare, a calm, empathetic healthcare triage assistant for a clinic.

You speak with patients in plain, reassuring language. You are NOT a doctor and you must never diagnose, prescribe, or give specific dosage instructions.

For every patient message you must decide between two paths:

1. SAFE_TO_ANSWER — General health questions, common medication info (purpose, general usage, common side effects — NOT dosing), lifestyle/nutrition/sleep/exercise advice, mild self-limiting symptoms (e.g. mild cold, minor headache), wellness questions. Answer directly, briefly, and warmly.

2. ESCALATE — Anything urgent or beyond general advice. Mandatory escalation triggers include but are not limited to: chest pain, difficulty or shortness of breath, severe pain, sudden weakness/numbness, confusion or altered mental state, severe bleeding, suicidal thoughts or self-harm, pregnancy complications, head injury, high fever in infants, signs of stroke or heart attack, severe allergic reactions, persistent or worsening symptoms, anything the patient describes as severe/getting worse/scary, or anything outside general advice.

When you ESCALATE: respond with empathy in 2-4 sentences. Acknowledge what they shared, do NOT minimize, tell them a clinician will follow up shortly, and — if symptoms could be life-threatening — gently advise them to call emergency services right now.

You MUST always call the "triage" tool exactly once with your structured decision. The "reply" field contains exactly what the patient will see.`;

const TOOL = {
  name: "triage",
  description:
    "Record the triage decision and the reply that will be shown to the patient.",
  input_schema: {
    type: "object",
    properties: {
      reply: {
        type: "string",
        description: "Plain-language reply shown to the patient.",
      },
      decision: {
        type: "string",
        enum: ["safe", "escalate"],
        description: "Whether this case is safe to answer or must be escalated.",
      },
      symptoms: {
        type: "array",
        items: { type: "string" },
        description:
          "Concise list of symptoms mentioned by the patient (empty if none).",
      },
      escalation_reason: {
        type: "string",
        description:
          "If escalating, a one-sentence clinical reason. Empty string if safe.",
      },
      urgency: {
        type: "string",
        enum: ["low", "medium", "high"],
        description:
          "Urgency level. Use 'high' for potentially life-threatening signs (chest pain, breathing difficulty, stroke signs, severe bleeding, suicidal ideation). 'medium' for concerning but not immediately life-threatening. 'low' for routine clinical follow-up. Use 'low' when decision is 'safe'.",
      },
      case_summary: {
        type: "string",
        description:
          "Short structured summary for the clinician (2-5 sentences). Empty string if safe.",
      },
    },
    required: [
      "reply",
      "decision",
      "symptoms",
      "escalation_reason",
      "urgency",
      "case_summary",
    ],
  },
};

interface TriageResult {
  reply: string;
  decision: "safe" | "escalate";
  symptoms: string[];
  escalation_reason: string;
  urgency: "low" | "medium" | "high";
  case_summary: string;
}

export const triageMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    const patientQuery = lastUser?.content ?? "";

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
        system: SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "triage" },
        messages: data.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
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
    const result = toolUse?.input;
    if (!result) throw new Error("Triage model did not return a decision");

    let caseId: string | null = null;
    if (result.decision === "escalate") {
      const { data: inserted, error } = await supabaseAdmin
        .from("escalated_cases")
        .insert({
          patient_query: patientQuery,
          symptoms: result.symptoms ?? [],
          escalation_reason: result.escalation_reason || "Escalated by triage",
          urgency: result.urgency,
          case_summary: result.case_summary || result.escalation_reason || "",
          status: "open",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to insert case:", error);
      } else {
        caseId = inserted.id;
      }
    }

    return {
      reply: result.reply,
      escalated: result.decision === "escalate",
      urgency: result.urgency,
      caseId,
    };
  });
