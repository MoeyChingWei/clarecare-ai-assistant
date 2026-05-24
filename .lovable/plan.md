# Patient Chat — Quick Keyword Templates

Goal: after the user picks English / 中文 / Bahasa Melayu, show the new guidance sentence and a row of 8 quick-keyword chips that insert a fillable template into the existing auto-resizing textarea (no auto-send).

All edits are scoped to `src/routes/chat.tsx`. No other files, no schema changes.

## 1. Update language thank-you message

Replace the three strings in `LANG_THANKS` (line ~56) with the new copy:
- en: "Thanks. You can now describe your symptom, ask a general health question, or choose one of the quick options below."
- zh: "谢谢。你现在可以描述你的症状、输入健康问题，或选择下面的快速选项。"
- ms: "Terima kasih. Anda boleh menerangkan simptom, bertanya soalan kesihatan, atau memilih pilihan pantas di bawah."

## 2. Replace the template dataset

Remove the current 4-key `TEMPLATES` map and add a localized `KEYWORD_TEMPLATES: Record<Lang, { key: string; label: string; template: string }[]>` containing the 8 entries per language exactly as specified in the request:

- en: Fever, Headache, Cough, Stomach pain, Medication question, Side effect, Appointment preparation, Request clinician review
- zh: 发烧, 头痛, 咳嗽, 肚子痛, 药物问题, 副作用, 预约准备, 请求医生复查
- ms: Demam, Sakit kepala, Batuk, Sakit perut, Soalan ubat, Kesan sampingan, Persediaan janji temu, Minta semakan doktor

Each entry's `template` is the multi-line readable template from the brief (preserved line breaks via `\n`).

## 3. Render quick-chip row inside `GuidancePanel`

`GuidancePanel` already mounts only when `lang` is set (line ~351), so it's the natural home for the chips. Changes:

- Render a new chip strip ABOVE the existing collapsible "What should I include?" toggle, always visible after language selection.
- Layout: `flex flex-wrap gap-2` so chips wrap cleanly on phones.
- Chip style: small rounded-full pill — `rounded-full border border-medical-blue/30 bg-medical-blue-soft px-3 py-1.5 text-xs font-medium text-foreground hover:bg-medical-blue/15`. Calm, medical, on-brand.
- On click: call `onPickTemplate(entry.template)` which already calls `setInput(...)` in the parent. No auto-send. Existing textarea auto-resize logic handles the multi-line growth.
- Remove the old 2-column `QuickButton` grid + `templatesTitle` block from inside the collapsible panel (replaced by the new chip row). Keep the "What should I include?" guidance bullets and emergency note as-is.
- Drop the now-unused `templatesTitle` and `buttons` keys from `GUIDANCE_COPY`.
- Drop the unused `QuickButton` component.

## 4. UI / UX details

- Chips appear immediately after the assistant's "Thanks…" message — same vertical position the GuidancePanel already occupies, just above the existing collapsible.
- Send button and emergency banner untouched.
- Mobile: chips wrap to multiple rows naturally; no horizontal scroll.
- Clicking a chip only fills the textarea — user can edit before pressing send (existing Enter-to-send still works).

## Out of scope

- Welcome message, language selection flow, Supabase escalation, Claude integration, dashboard, end-of-conversation review card — all unchanged.
