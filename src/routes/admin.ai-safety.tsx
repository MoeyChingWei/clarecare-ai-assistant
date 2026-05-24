import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ShieldAlert,
  BookOpen,
  TestTube2,
  Plus,
  Trash2,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { runTestCase } from "@/lib/triage.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/ai-safety")({
  head: () => ({
    meta: [
      { title: "ClareCare — AI Safety Admin" },
      {
        name: "description",
        content:
          "Manage red flag rules, approved knowledge base, and triage test cases for ClareCare AI.",
      },
    ],
  }),
  component: AdminPage,
});

type RedFlagRule = {
  id: string;
  keyword: string;
  urgency: "low" | "medium" | "high";
  escalation_reason: string;
  active: boolean;
};

type KbItem = {
  id: string;
  category: string;
  question: string;
  approved_answer: string;
  source: string;
  active: boolean;
};

type TestCase = {
  id: string;
  patient_query: string;
  expected_decision: "SAFE_TO_ANSWER" | "ESCALATE";
  expected_urgency: "low" | "medium" | "high";
  last_result: string | null;
  last_actual_decision: string | null;
  last_actual_urgency: string | null;
  last_run_at: string | null;
};

function AdminPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-medical-blue-soft/40 via-background to-background">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            AI Safety Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage how ClareCare's AI triages patients. Changes take effect on
            the next chat message.
          </p>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules" className="gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> Red Flag Rules
            </TabsTrigger>
            <TabsTrigger value="kb" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="tests" className="gap-1.5">
              <TestTube2 className="h-3.5 w-3.5" /> Test Cases
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4">
            <RedFlagRulesPanel />
          </TabsContent>
          <TabsContent value="kb" className="mt-4">
            <KnowledgeBasePanel />
          </TabsContent>
          <TabsContent value="tests" className="mt-4">
            <TestCasesPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- Red Flag Rules ---------------- */

function RedFlagRulesPanel() {
  const [rows, setRows] = useState<RedFlagRule[]>([]);
  const [keyword, setKeyword] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("high");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("red_flag_rules")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data as RedFlagRule[]) ?? []);
  };
  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    if (!keyword.trim() || !reason.trim()) return;
    setLoading(true);
    await supabase.from("red_flag_rules").insert({
      keyword: keyword.trim(),
      urgency,
      escalation_reason: reason.trim(),
      active: true,
    });
    setKeyword("");
    setReason("");
    setLoading(false);
    void load();
  };

  const toggle = async (r: RedFlagRule) => {
    await supabase
      .from("red_flag_rules")
      .update({ active: !r.active })
      .eq("id", r.id);
    void load();
  };

  const remove = async (id: string) => {
    await supabase.from("red_flag_rules").delete().eq("id", id);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Add new rule</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_2fr_auto]">
          <div>
            <Label className="text-xs">Keyword</Label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. chest pain"
            />
          </div>
          <div>
            <Label className="text-xs">Urgency</Label>
            <select
              value={urgency}
              onChange={(e) =>
                setUrgency(e.target.value as "low" | "medium" | "high")
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Escalation reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Possible cardiac event…"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={add} disabled={loading} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Keyword</th>
              <th className="px-4 py-2 text-left">Urgency</th>
              <th className="px-4 py-2 text-left">Reason</th>
              <th className="px-4 py-2 text-left">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="px-4 py-2 font-medium">{r.keyword}</td>
                <td className="px-4 py-2">
                  <UrgencyPill urgency={r.urgency} />
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {r.escalation_reason}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggle(r)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      r.active
                        ? "bg-medical-green-soft text-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.active ? "Active" : "Disabled"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => remove(r.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No rules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Knowledge Base ---------------- */

function KnowledgeBasePanel() {
  const [rows, setRows] = useState<KbItem[]>([]);
  const [category, setCategory] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("knowledge_base")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data as KbItem[]) ?? []);
  };
  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    if (!category.trim() || !question.trim() || !answer.trim()) return;
    await supabase.from("knowledge_base").insert({
      category: category.trim(),
      question: question.trim(),
      approved_answer: answer.trim(),
      source: source.trim(),
      active: true,
    });
    setCategory("");
    setQuestion("");
    setAnswer("");
    setSource("");
    void load();
  };

  const toggle = async (k: KbItem) => {
    await supabase
      .from("knowledge_base")
      .update({ active: !k.active })
      .eq("id", k.id);
    void load();
  };
  const remove = async (id: string) => {
    await supabase.from("knowledge_base").delete().eq("id", id);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Add approved answer</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Nutrition"
            />
          </div>
          <div>
            <Label className="text-xs">Source</Label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. NHS guidance"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Question</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="How much water should I drink per day?"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Approved answer</Label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Most healthy adults need around 6–8 cups of fluid per day…"
              rows={3}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={add} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add answer
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((k) => (
          <div
            key={k.id}
            className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-medical-blue-soft px-2 py-0.5 text-[11px] font-medium text-foreground">
                    {k.category}
                  </span>
                  <button
                    onClick={() => toggle(k)}
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      k.active
                        ? "bg-medical-green-soft text-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {k.active ? "Active" : "Disabled"}
                  </button>
                  {k.source && (
                    <span className="text-[11px] text-muted-foreground">
                      Source: {k.source}
                    </span>
                  )}
                </div>
                <p className="font-medium">{k.question}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {k.approved_answer}
                </p>
              </div>
              <button
                onClick={() => remove(k.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            No approved answers yet.
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Test Cases ---------------- */

function TestCasesPanel() {
  const runTest = useServerFn(runTestCase);
  const [rows, setRows] = useState<TestCase[]>([]);
  const [query, setQuery] = useState("");
  const [decision, setDecision] = useState<"SAFE_TO_ANSWER" | "ESCALATE">(
    "ESCALATE",
  );
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("high");
  const [running, setRunning] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("test_cases")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data as TestCase[]) ?? []);
  };
  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    if (!query.trim()) return;
    await supabase.from("test_cases").insert({
      patient_query: query.trim(),
      expected_decision: decision,
      expected_urgency: urgency,
    });
    setQuery("");
    void load();
  };
  const remove = async (id: string) => {
    await supabase.from("test_cases").delete().eq("id", id);
    void load();
  };
  const run = async (id: string) => {
    setRunning(id);
    try {
      await runTest({ data: { testCaseId: id } });
      await load();
    } finally {
      setRunning(null);
    }
  };
  const runAll = async () => {
    for (const r of rows) {
      setRunning(r.id);
      try {
        await runTest({ data: { testCaseId: r.id } });
      } catch (e) {
        console.error(e);
      }
    }
    setRunning(null);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Add test case</h2>
        <div className="grid gap-3 sm:grid-cols-[2fr_160px_140px_auto]">
          <div>
            <Label className="text-xs">Patient query</Label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="I have severe chest pain"
            />
          </div>
          <div>
            <Label className="text-xs">Expected decision</Label>
            <select
              value={decision}
              onChange={(e) =>
                setDecision(e.target.value as "SAFE_TO_ANSWER" | "ESCALATE")
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              <option value="ESCALATE">ESCALATE</option>
              <option value="SAFE_TO_ANSWER">SAFE_TO_ANSWER</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Expected urgency</Label>
            <select
              value={urgency}
              onChange={(e) =>
                setUrgency(e.target.value as "low" | "medium" | "high")
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={add} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={runAll}
          disabled={running !== null || rows.length === 0}
          className="gap-1.5"
        >
          <Play className="h-3.5 w-3.5" /> Run all
        </Button>
      </div>

      <div className="space-y-2">
        {rows.map((t) => {
          const isRunning = running === t.id;
          return (
            <div
              key={t.id}
              className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.patient_query}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      Expected:{" "}
                      <strong className="text-foreground">
                        {t.expected_decision}
                      </strong>{" "}
                      / {t.expected_urgency}
                    </span>
                    {t.last_actual_decision && (
                      <span>
                        · Got:{" "}
                        <strong className="text-foreground">
                          {t.last_actual_decision}
                        </strong>{" "}
                        / {t.last_actual_urgency}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.last_result === "pass" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-medical-green-soft px-2 py-0.5 text-[11px] font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Pass
                    </span>
                  )}
                  {t.last_result === "fail" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      <XCircle className="h-3 w-3" /> Fail
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => run(t.id)}
                    disabled={isRunning}
                    className="gap-1.5"
                  >
                    {isRunning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    Run test
                  </Button>
                  <button
                    onClick={() => remove(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            No test cases yet.
          </p>
        )}
      </div>
    </div>
  );
}

function UrgencyPill({ urgency }: { urgency: "low" | "medium" | "high" }) {
  const styles =
    urgency === "high"
      ? "bg-red-100 text-red-800"
      : urgency === "medium"
        ? "bg-amber-100 text-amber-800"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles}`}>
      {urgency}
    </span>
  );
}
