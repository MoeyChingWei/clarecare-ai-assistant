import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type LiveMessage = {
  id: string;
  assignment_id: string;
  sender: "patient" | "doctor";
  message: string;
  created_at: string;
};

interface Props {
  assignmentId: string;
  selfRole: "patient" | "doctor";
  doctorName: string;
  /** Visual variant. "patient" gets a warm tone; "doctor" gets a clean panel. */
  variant?: "patient" | "doctor";
  className?: string;
  heightClass?: string;
}

export function LiveChatPanel({
  assignmentId,
  selfRole,
  doctorName,
  variant = "patient",
  className = "",
  heightClass = "max-h-[28rem]",
}: Props) {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("live_chat_messages")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setMessages((data ?? []) as LiveMessage[]);
      });

    const channel = supabase
      .channel(`live_chat_${assignmentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `assignment_id=eq.${assignmentId}`,
        },
        (payload) => {
          const row = payload.new as LiveMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [assignmentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("live_chat_messages").insert({
        assignment_id: assignmentId,
        sender: selfRole,
        message: text,
      });
      if (error) throw error;
      setInput("");
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const wrapperBg =
    variant === "patient"
      ? "bg-amber-50/40 border-amber-200/70"
      : "bg-card border-border/70";

  return (
    <div
      className={`rounded-2xl border ${wrapperBg} shadow-sm ${className}`}
    >
      <div
        ref={scrollRef}
        className={`space-y-2 overflow-y-auto p-3 ${heightClass}`}
      >
        {messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {selfRole === "patient"
              ? `Say hello to Dr. ${doctorName} 👋`
              : "No messages yet — start the conversation."}
          </p>
        ) : (
          messages.map((m) => (
            <Bubble key={m.id} msg={m} selfRole={selfRole} doctorName={doctorName} />
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-border/60 bg-background/70 p-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={
            selfRole === "patient"
              ? `Message Dr. ${doctorName}…`
              : "Reply to patient…"
          }
          className="min-h-[40px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring/40"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-medical-blue text-primary-foreground transition-opacity disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function Bubble({
  msg,
  selfRole,
  doctorName,
}: {
  msg: LiveMessage;
  selfRole: "patient" | "doctor";
  doctorName: string;
}) {
  const isSelf = msg.sender === selfRole;
  const isDoctor = msg.sender === "doctor";

  if (isSelf) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-medical-blue px-3.5 py-2 text-sm leading-relaxed text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap">{msg.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      {isDoctor && (
        <span className="px-1 text-[11px] font-medium text-medical-blue">
          Dr. {doctorName}
        </span>
      )}
      <div
        className={`max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
          isDoctor
            ? "border border-medical-blue/30 bg-medical-blue-soft text-foreground"
            : "border border-border/70 bg-background text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap">{msg.message}</p>
      </div>
    </div>
  );
}
