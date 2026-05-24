## Add close button to intake popup

Add a small "X" close button at the top-right of the Welcome to ClareCare intake overlay (the name + phone form on `/chat`).

### Behavior

- Icon-only button (lucide `X`), positioned absolutely top-right inside the card.
- Accessible label "Close".
- On click: navigate back to the landing page (`/`). Since the chat requires name + phone before use, closing the form exits to home rather than revealing a non-functional chat behind it.

### Files

- `src/routes/chat.tsx` — update `IntakeOverlay`:
  - Accept an `onClose` prop (or use `useNavigate` directly).
  - Add the close button inside the card (relative wrapper, `X` from lucide-react).
  - Wire parent to pass a handler that calls `navigate({ to: "/" })`.

### Out of scope

- No change to the form fields, validation, or submit behavior.
- No change to localStorage logic or any other route.