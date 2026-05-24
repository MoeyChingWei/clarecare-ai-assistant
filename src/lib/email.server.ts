// Email provider abstraction. Returns { ok, error } and never throws.
export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export function getEmailConfig() {
  const provider = (process.env.EMAIL_PROVIDER || "").toLowerCase();
  const from = process.env.EMAIL_FROM || "";
  const configured = provider === "resend"
    ? !!process.env.RESEND_API_KEY && !!from
    : provider === "gmail"
    ? !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) && !!from
    : false;
  return { provider, from, configured };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = getEmailConfig();
  if (!cfg.configured) {
    return { ok: false, error: "Email provider not configured" };
  }

  try {
    if (cfg.provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: cfg.from,
          to: [input.to],
          subject: input.subject,
          text: input.body,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "send failed");
        return { ok: false, error: `Resend error: ${res.status} ${errText.slice(0, 200)}` };
      }
      return { ok: true };
    }
    if (cfg.provider === "gmail") {
      // Refresh access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GMAIL_CLIENT_ID!,
          client_secret: process.env.GMAIL_CLIENT_SECRET!,
          refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
          grant_type: "refresh_token",
        }),
      });
      if (!tokenRes.ok) return { ok: false, error: `Gmail token error: ${tokenRes.status}` };
      const { access_token } = (await tokenRes.json()) as { access_token: string };
      const raw = [
        `From: ${cfg.from}`,
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        input.body,
      ].join("\r\n");
      const encoded = Buffer.from(raw).toString("base64url");
      const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encoded }),
      });
      if (!sendRes.ok) {
        const errText = await sendRes.text().catch(() => "send failed");
        return { ok: false, error: `Gmail error: ${sendRes.status} ${errText.slice(0, 200)}` };
      }
      return { ok: true };
    }
    return { ok: false, error: "Unsupported provider" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
