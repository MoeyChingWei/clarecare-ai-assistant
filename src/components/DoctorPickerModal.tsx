import { useEffect, useState } from "react";
import { X, UserCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type DoctorRow = {
  id: string;
  full_name: string;
  speciality: string | null;
  is_online: boolean;
  active_patients: number;
};

export type AssignmentResult = {
  assignmentId: string;
  doctorId: string;
  doctorName: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  patientName: string;
  patientPhone: string;
  /** Resolves an existing case id (or creates one and returns it). */
  ensureCaseId: () => Promise<string | null>;
  onAssigned: (result: AssignmentResult) => void;
}

export function DoctorPickerModal({
  open,
  onClose,
  patientName,
  patientPhone,
  ensureCaseId,
  onAssigned,
}: Props) {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase
      .from("doctor_accounts")
      .select("id, full_name, speciality, is_online, active_patients")
      .order("active_patients", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError("Could not load doctors. Please try again.");
        } else {
          setDoctors(data ?? []);
        }
        setLoading(false);
      });

    const channel = supabase
      .channel("doctor_picker_status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "doctor_accounts" },
        (payload) => {
          const row = payload.new as DoctorRow;
          setDoctors((prev) =>
            prev.map((d) => (d.id === row.id ? { ...d, ...row } : d)),
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [open]);

  const onlineDoctors = doctors.filter((d) => d.is_online);
  const offlineDoctors = doctors.filter((d) => !d.is_online);


  const assignTo = async (doctor: DoctorRow) => {
    setBusyId(doctor.id);
    setError(null);
    try {
      const caseId = await ensureCaseId();
      const { data, error: insertErr } = await supabase
        .from("doctor_patient_assignments")
        .insert({
          patient_name: patientName,
          patient_phone: patientPhone,
          doctor_id: doctor.id,
          escalated_case_id: caseId,
          status: "active",
        })
        .select("id")
        .single();
      if (insertErr || !data) throw insertErr ?? new Error("Insert failed");

      // Best-effort increment
      await supabase
        .from("doctor_accounts")
        .update({ active_patients: doctor.active_patients + 1 })
        .eq("id", doctor.id);

      onAssigned({
        assignmentId: data.id,
        doctorId: doctor.id,
        doctorName: doctor.full_name,
      });
      onClose();
    } catch (e) {
      console.error(e);
      setError("Could not connect you to that doctor. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const autoAssign = async () => {
    setAutoBusy(true);
    setError(null);
    try {
      const candidate =
        onlineDoctors.slice().sort((a, b) => a.active_patients - b.active_patients)[0] ??
        doctors.slice().sort((a, b) => a.active_patients - b.active_patients)[0];
      if (!candidate) {
        setError("No doctors are registered yet. Please try again later.");
        return;
      }
      await assignTo(candidate);
    } finally {
      setAutoBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose a doctor"
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-border/70 bg-medical-blue-soft/40 px-5 pb-4 pt-5">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Choose a Doctor
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Connect with a clinician to continue your care.
          </p>
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading doctors…
            </div>
          ) : (
            <>
              {onlineDoctors.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Available now
                  </h3>
                  <div className="space-y-2">
                    {onlineDoctors.map((d) => (
                      <article
                        key={d.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background p-3 shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            Dr. {d.full_name}
                          </p>
                          {d.speciality && (
                            <p className="truncate text-xs text-muted-foreground">
                              {d.speciality}
                            </p>
                          )}
                          <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-medical-green">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-medical-green opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-medical-green" />
                            </span>
                            Online
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => assignTo(d)}
                          disabled={busyId === d.id || autoBusy}
                          className="shrink-0 rounded-xl bg-medical-blue px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {busyId === d.id ? "Connecting…" : "Select"}
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {offlineDoctors.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Other doctors
                  </h3>
                  <div className="space-y-2">
                    {offlineDoctors.map((d) => (
                      <article
                        key={d.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background p-3 shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            Dr. {d.full_name}
                          </p>
                          {d.speciality && (
                            <p className="truncate text-xs text-muted-foreground">
                              {d.speciality}
                            </p>
                          )}
                          <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                            Currently offline — may take longer to respond
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => assignTo(d)}
                          disabled={busyId === d.id || autoBusy}
                          className="shrink-0 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          {busyId === d.id ? "Connecting…" : "Select"}
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}



              <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Assign to any available doctor
                </h3>
                <div className="rounded-2xl border border-medical-blue/20 bg-medical-blue-soft/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    We'll connect you as soon as a doctor is free.
                  </p>
                  <button
                    type="button"
                    onClick={autoAssign}
                    disabled={autoBusy || !!busyId}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-medical-blue px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {autoBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                    Assign me to the next available doctor
                  </button>
                </div>
              </section>

              {error && (
                <p className="rounded-md bg-urgency-high-soft px-3 py-2 text-xs text-urgency-high">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
