import { createFileRoute, redirect } from "@tanstack/react-router";

// Kept for backwards compatibility with any lingering imports.
export const DOCTOR_SESSION_KEY = "clarecare_doctor_session";

export const Route = createFileRoute("/doctor-login")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
