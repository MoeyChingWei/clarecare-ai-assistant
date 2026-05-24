import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { submitFeedback } from "@/lib/feedback.functions";
import { loadSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultRole?: "patient" | "doctor" | "admin";
  language?: "en" | "zh" | "ms";
}

const SUCCESS_MSG = {
  en: "Thank you. Your feedback has been submitted.",
  zh: "谢谢。你的反馈已经提交。",
  ms: "Terima kasih. Maklum balas anda telah dihantar.",
};

export function FeedbackModal({ open, onClose, defaultRole = "patient", language = "en" }: Props) {
  const submit = useServerFn(submitFeedback);
  const [feedbackType, setFeedbackType] = useState("user_experience");
  const [priority, setPriority] = useState("medium");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const reset = () => {
    setFeedbackType("user_experience");
    setPriority("medium");
    setTitle("");
    setMessage("");
    setEmail("");
    setSuccess(false);
    setError("");
  };
  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const session = loadSession();
      await submit({
        data: {
          token: session?.token,
          feedbackType: feedbackType as never,
          priority: priority as never,
          title: title.trim(),
          message: message.trim(),
          submittedByEmail: email.trim() || undefined,
        },
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const typeOptions = defaultRole === "doctor"
    ? ["ai_response_issue", "dashboard_improvement", "safety_concern", "system_bug", "other"]
    : defaultRole === "admin"
    ? ["system_bug", "ai_response_issue", "safety_concern", "user_experience", "other"]
    : ["user_experience", "ai_response_issue", "system_bug", "other"];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Send feedback</h2>
          <button onClick={close} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4">
            <p className="rounded-md bg-medical-green-soft px-3 py-2 text-sm">{SUCCESS_MSG[language]}</p>
            <Button className="w-full" onClick={close}>Close</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={4000} required />
            </div>
            <div>
              <Label className="text-xs">Your email (optional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            </div>
            {error && <p className="rounded-md bg-urgency-high-soft px-3 py-2 text-xs text-urgency-high">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Sending…" : "Submit feedback"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
