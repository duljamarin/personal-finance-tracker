# UI Quality Principles — Anti "Vibe-Coded" Checklist

This document captures patterns to avoid when adding new UI to the landing page or demo workspace. These are subtle signals that make an interface look auto-generated rather than intentional.

---

## Signals that make an interface look vibe-coded

### 1. Pulsing / animated status dots
- `animate-pulse` on colored circles used as "live" or "status" indicators
- macOS-style traffic light dots (red `#ff5f57`, yellow `#febc2e`, green `#28c840`) on fake browser chrome
- Any small colored circle that draws attention to itself without conveying real data

**Rule:** Do not add pulsing dots or status indicators. If a UI element is "live", the content itself communicates that — no dot needed.

### 2. Pill badges with background + dot + animation
- `rounded-full` pills with a colored background, a pulsing dot, and a label like "Demo live", "Beta", "New", "Live"
- These are the most recognizable AI-generated UI pattern

**Rule:** Remove them. If a label is truly necessary, use plain text with no background, no dot, no animation.

### 3. Opacity-reduced white text in dark mode
- `dark:text-white/50`, `dark:text-white/55`, `dark:text-white/60`, `dark:text-white/65`, `dark:text-white/70`, `dark:text-white/75`
- These render as gray and create the impression of a low-effort dark mode

**Rule:** All text in dark mode should be `dark:text-white`. Use font-weight and size for hierarchy, not opacity.

**Scope — this rule is about TEXT.** Two intentional exceptions:
- Input placeholders (`dark:placeholder:text-white/40`) — lower contrast is correct UX there.
- Decorative/supporting **icons** (`dark:text-white/60`), which should sit behind the label they accompany rather than compete with it.

Neither exception licenses dimming a sentence a user has to read.

### 3b. Grey body text to "soften" hierarchy (light mode)
- Swapping `text-ink-muted` (`#2F2F2C`) for `text-ink-secondary` (`#44443F`) on body copy
- Any mid-grey applied to running text so it "recedes" behind the heading

This is the light-mode twin of rule 3. It looks like a considered choice and is
not: the reader registers washed-out grey text, not hierarchy.

**Rule:** Body copy stays `text-ink-muted` / `dark:text-white`. Build hierarchy
with **font-weight, size, and spacing** — the heading is already 700 at 3.5rem;
it does not need the paragraph dimmed to win. `ink-secondary` exists for
non-text chrome, not for paragraphs.

### 4. Over-designed mockup frames
- `shadow-xl`, `shadow-2xl`, heavy drop shadows on demo containers
- Multiple stacked decorative borders or gradients around screenshots

**Rule:** Use `box-shadow: 0 2px 16px rgba(0,0,0,0.08)` — a clean, barely-visible shadow that lets the product speak. No glow, no colored shadow.

### 5. Fake browser chrome with colored decorations
- The three macOS dots serve no functional purpose and read as clip-art
- Any "browser" bar element that doesn't show just the URL

**Rule:** Minimal browser bar = URL text only, neutral background, no dots, no icons, no trailing labels.

### 6. Semibold everywhere
- `font-semibold` (600) on button labels, FAQ questions, table headers, list items
- Inter Tight at 600 is heavy for UI controls; a screen where every label is 600
  has no hierarchy left — everything shouts, so nothing does

**Rule:** `font-medium` (500) for button labels, form labels, accordion
questions, and table headers. Reserve 600+ for headings and focal numbers.

### 7. Fighting `!important` with a new escape-hatch class
- Inventing `.ink-soft`, `.text-override`, `.force-*` to defeat the dark-mode
  `!important` block in `index.css`
- Each one is a private exception that the next person will not know about

**Rule:** If a global rule blocks what you want, that rule is usually right and
the intent is usually wrong — re-read the principle before adding a bypass.
Never add a class whose only purpose is to out-specify project CSS.

### 8. Claiming a visual fix without comparing screenshots
- Changing `font-smoothing`, letter-spacing, or a shadow and asserting it "fixes"
  a rendering complaint
- These often produce **zero** measurable difference; the change survives in the
  codebase as cargo cult

**Rule:** Any change justified by "it looks better" must be verified with a real
before/after screenshot at the same viewport and DPR. If the two images are
indistinguishable, revert it — do not ship it with a confident comment.

### 9. Decorative icons that repeat the adjacent label
- A lock icon next to "Encrypted", a chart icon next to "Reports"
- Fine when it aids scanning in a grid; noise when it merely restates the text

**Rule:** An icon must add recognition speed, not decoration. If removing it
loses nothing, remove it.

### 10. Copy that overstates what the product does
- "Bank-level security", "AI-powered", "military-grade encryption"
- Marketing superlatives that the implementation cannot back

**Rule:** Describe the mechanism, not the adjective. "Encrypted on your device
with a key only you hold" beats "bank-level security" — it is specific, true,
and verifiable in `utils/crypto/fieldMap.js`. If a claim changes, the copy must
change with it.

---

## What to use instead

| Avoided pattern | Replacement |
|---|---|
| Pulsing green dot | Nothing — remove it |
| "Demo live" pill badge | Nothing, or plain text like `Live demo · try it now` |
| `dark:text-white/60` | `dark:text-white` |
| `shadow-xl` on demo frame | `box-shadow: 0 2px 16px rgba(0,0,0,0.08)` |
| macOS traffic light dots | Empty space — URL bar only |
| `animate-pulse` on decorative elements | Nothing |
| `text-ink-secondary` on body copy | `text-ink-muted` + lighter font-weight |
| `font-semibold` on button/FAQ labels | `font-medium` |
| A new class to beat `!important` | Re-read the rule you are fighting |
| "Bank-level security" | The actual mechanism, stated plainly |

---

## General heuristic

If an element exists only to signal "this is interactive" or "this is live" rather than to show actual data or enable an action, remove it. Real products don't announce themselves.

## Before/after discipline

Every rule above describes a change that *felt* like an improvement to whoever
made it. That is exactly why they need a check:

1. **Read this file before the first edit**, not after someone objects.
2. **Screenshot before and after** at the same viewport and DPR for any change
   argued on appearance. Identical images mean revert, not ship.
3. **Prefer removing over adding.** Most fixes here were deletions: a dot, a
   badge, a grey, a class. Reach for subtraction first.
4. **When a global rule blocks you, suspect your intent**, not the rule.
