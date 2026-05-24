## Patient Chat UI Updates

Five focused UI/UX changes to `src/routes/index.tsx` and the triage server function. No schema changes.

### 1. Opening message
Replace the assistant's first message with:
> "I help with 3 things: ① Medication questions ② Appointment prep ③ General health info. What brings you here today?"

### 2. Persistent disclaimer bar
Replace the current soft disclaimer card with a slim bar pinned to the top of the page (above `AppHeader` or directly under it, full-width, `sticky top-0 z-40`):
> "Guidance only • Not a diagnosis • Emergency? Call 999"

Style: tiny text, muted background (`bg-muted/60`), no close button, always visible.

### 3. Status badge under every AI response
After each assistant bubble, render a small inline pill:
- Safe → green: `✓ Handled by ClareCare`
- Escalated → amber: `🔔 Flagging for clinician`

This replaces the current "Flagged for clinician follow-up" inline notice inside the bubble — moves it out, makes it a consistent status indicator on every AI message.

### 4. Escalation reason in the reply
Update the system prompt in `src/lib/triage.functions.ts` so when the model escalates, the `reply` field follows the pattern:
> "I'm flagging this because you mentioned [trigger]. A clinician will review within 2 hours. [optional empathy / 999 advice if life-threatening]"

The `[X]` is filled by the model from the actual symptom/keyword the patient mentioned. Keep the existing tool-use structure — only the prompt instruction for the `reply` field changes.

### 5. "Request human review" button
Below every assistant message (both safe and escalated), render a ghost-style link-button:
> "Prefer to speak to someone? Request review"

Behavior: on click, insert an escalation row into `escalated_cases` (urgency `low`, reason `"Patient requested human review"`, summary built from recent conversation) and show a small confirmation: "Request sent — a clinician will follow up." Disable the button after click for that message.

This needs a new server function `requestHumanReview` in `src/lib/triage.functions.ts` that takes the recent conversation and inserts the row via `supabaseAdmin`.

### Files touched
- `src/routes/index.tsx` — opening message, disclaimer bar, status badge, review button, confirmation state
- `src/lib/triage.functions.ts` — system prompt tweak + new `requestHumanReview` server fn

### Out of scope
No DB migration (existing schema covers it). No clinician dashboard changes. No auth.
