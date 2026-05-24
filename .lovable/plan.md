## ClareCare — AI Triage Web App

A single-page app with two routes: `/` (Patient Chat) and `/clinician` (Dashboard). Cases are stored in Lovable Cloud (Supabase) and the dashboard syncs in real time. Triage logic runs server-side via Claude.

### 1. Backend (Lovable Cloud)

**Table: `escalated_cases`**
- `id` (uuid, pk)
- `patient_query` (text) — original message
- `symptoms` (text[]) — extracted symptoms
- `escalation_reason` (text)
- `urgency` (text: 'low' | 'medium' | 'high')
- `case_summary` (text) — AI-generated structured summary
- `status` (text: 'open' | 'resolved', default 'open')
- `created_at`, `resolved_at` (timestamptz)

RLS: public read/insert/update for MVP (no login). Realtime enabled on the table.

**Secret:** `ANTHROPIC_API_KEY` (requested via add_secret).

### 2. Triage server function

`src/lib/triage.functions.ts` — `createServerFn` that:
1. Receives `{ messages: [...] }` (full conversation).
2. Calls Claude (`claude-sonnet-4`) with a system prompt instructing it to respond conversationally AND return a JSON tool call indicating `safe` or `escalate` with the structured fields (symptoms, reason, urgency, summary).
3. If escalate → insert row into `escalated_cases` via `supabaseAdmin`.
4. Returns `{ reply, escalated, urgency? }` to the client.

Uses Claude tool-use to force structured output alongside the natural-language reply.

### 3. Patient Chat (`/`)

- Centered mobile-friendly column, soft white/blue.
- Message list with user/assistant bubbles, typing indicator.
- Composer at the bottom.
- When the assistant escalates, an inline notice appears: "A clinician will follow up shortly" with the urgency level.
- Subtle empathetic tone; clearly NOT a medical diagnosis (footer disclaimer).

### 4. Clinician Dashboard (`/clinician`)

- Desktop-optimized grid of cards, sorted by urgency then recency.
- Filter tabs: Open / Resolved.
- Each card: truncated query, color-coded urgency badge (green/amber/red), AI summary, timestamp (relative), "Mark Resolved" button.
- Live updates via Supabase realtime channel subscription on `escalated_cases`.
- Empty state when no open cases.

### 5. Design system (`src/styles.css`)

- Background: near-white; primary: calm clinical blue; accent: soft green; urgency tokens: green/amber/red.
- Typography: Inter for body, a slightly warmer display font for headings.
- Generous spacing, soft shadows, rounded-xl cards.
- Add semantic tokens: `--medical-blue`, `--medical-green`, `--urgency-low/med/high`.

### 6. Routes & nav

- `src/routes/index.tsx` → Patient Chat
- `src/routes/clinician.tsx` → Dashboard
- Minimal top bar with two links to switch views (subtle, not prominent for patients).

### Technical notes

- Anthropic call goes through a server function (never client-side) using `process.env.ANTHROPIC_API_KEY`.
- Realtime: subscribe in `useEffect` on the dashboard, invalidate query on INSERT/UPDATE.
- TanStack Query for cases list; `useSuspenseQuery` + loader pattern.
- No auth (MVP); RLS policies allow anon access — flagged as intentional in security memory.

### Deliverables checklist

1. Enable Lovable Cloud, create table + RLS + realtime.
2. Request `ANTHROPIC_API_KEY` secret.
3. Design tokens in `styles.css`.
4. `triage.functions.ts` with Claude integration.
5. Patient chat route + components.
6. Clinician dashboard route + realtime hook.
7. Shared header with view toggle.
