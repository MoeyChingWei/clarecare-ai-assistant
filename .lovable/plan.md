## Goal

Eliminate the duplicated AI summary on `/clinician`. Keep the full summary only in the right-hand detail panel; reduce the left list card to scannable identity + urgency + time.

## Change

Single file: `src/routes/clinician.tsx` — the patient list card inside the `filtered.map(...)` block.

**Before** each card renders: name, urgency dot, phone, 2-line `case.case_summary` preview, relative time.

**After** each card renders: name, urgency dot, phone, relative time. The `case_summary` line is removed.

Optionally also surface a small urgency text label next to the dot for quicker scanning (e.g. "High"), since we're freeing up vertical space — keeps cards informative without bringing the summary back.

## What stays the same

- Detail panel `AI Summary` block (summary + symptoms + original message + reason) — unchanged. This becomes the single source of truth.
- Mobile behavior — list and detail are already swapped via the `selected` state; no layout change needed.
- All data fetching, realtime subscriptions, resolve flow, doctor session logic — untouched.

## Technical details

In `src/routes/clinician.tsx`, inside the list-card button (~lines 268–289), delete the block:

```tsx
{a.case?.case_summary && (
  <p className="mt-2 line-clamp-2 text-xs text-foreground/80">
    {a.case.case_summary}
  </p>
)}
```

Adjust spacing on the time row (`mt-2` → `mt-1.5`) so the card stays balanced after the summary is removed. Optionally replace the bare `UrgencyDot` with a compact urgency pill (text + dot) using existing `urgency-*` tokens.

No other files, no schema changes, no business logic changes.
