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

**Rule:** All text in dark mode should be `dark:text-white`. Use font-weight and size for hierarchy, not opacity. Exception: placeholder text in inputs (`dark:placeholder:text-white/40`) where lower contrast is intentional UX.

### 4. Over-designed mockup frames
- `shadow-xl`, `shadow-2xl`, heavy drop shadows on demo containers
- Multiple stacked decorative borders or gradients around screenshots

**Rule:** Use `box-shadow: 0 2px 16px rgba(0,0,0,0.08)` — a clean, barely-visible shadow that lets the product speak. No glow, no colored shadow.

### 5. Fake browser chrome with colored decorations
- The three macOS dots serve no functional purpose and read as clip-art
- Any "browser" bar element that doesn't show just the URL

**Rule:** Minimal browser bar = URL text only, neutral background, no dots, no icons, no trailing labels.

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

---

## General heuristic

If an element exists only to signal "this is interactive" or "this is live" rather than to show actual data or enable an action, remove it. Real products don't announce themselves.
