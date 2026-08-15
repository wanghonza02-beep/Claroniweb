# Claroni — Design System

> Reference document for generating UI screens, components, and marketing assets in Claude Design. Paste this whole file as context before requesting mockups.

---

## 1. Brand Overview

**Product:** Claroni is an ultra-minimalist, automated finance tracker for students and early-stage startups. It auto-syncs with bank cards for zero-effort tracking, turning chaotic transaction data into clear, calming, actionable insights.

**Audience:** Students and early-stage founders who find traditional banking apps cluttered and stressful.

**Core promise:** Absolute simplicity → more user action, more financial awareness.

**Brand personality:** Smart, straightforward, proactive. Acts like an honest best friend, not a bank.

**Example brand voice:**
- "You can't afford this today — here's a cheaper alternative."
- "New Transaction" / "Account Balance" — plain, no jargon, no corporate tone.

**UI Philosophy — Anti-clutter:**
One clear message or one clear action per screen. No dense tables, no endless settings, no cognitive overload. If a screen needs a legend to explain itself, it's too complex.

---

## 2. Logo

**Mark:** A monogram "C" built from two overlapping open strokes — organic, hand-drawn-adjacent, not geometric/rigid. Rendered as an outline (stroke only, no fill).

**Wordmark:** "Claroni" set in the numeric/technical mono font (see Typography), lowercase.

**Color:** Single-color brown (`#785438`) on cream (`#F1E9D6`). Never place the mark on a busy background — it needs quiet space to read.

**Clear space:** Minimum clear space around the mark = height of the "C" on all sides.

**Don't:**
- Don't fill the C solid.
- Don't recolor it to an accent/semantic color (keep it brand-brown or pure white/black on dark surfaces only).
- Don't pair the wordmark with a body sans-serif — it must stay in the mono font for brand recognition.

---

## 3. Color System

Colors extracted directly from your reference files (not estimated) — `bg-base` and `brand-primary` are pixel-exact matches to your logo file.

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#F1E9D6` | App background (exact match to your logo file) |
| `surface` | `#FBF7EF` | Cards, sheets, modals |
| `surface-alt` | `#FFFFFF` | Elevated surfaces, inputs |
| `text-primary` | `#2B2117` | Headlines, body, numbers |
| `text-secondary` | `#8A7A65` | Labels, captions, timestamps |
| `border` | `#E3D8C2` | Dividers, card outlines |
| `brand-primary` | `#785438` | Logo, primary buttons, active states (exact logo brown) |
| `brand-primary-dark` | `#5E4128` | Pressed/hover state |
| `accent` | `#C9A876` | Highlights, chips, secondary CTAs |
| `positive` | `#6B8F71` | Income, savings, "on track" |
| `negative` | `#C4694F` | Overspending, alerts (muted, not alarming) |
| `insight` | `#D4A657` | Claroni's proactive insight callouts |

**Note on semantic colors:** deliberately avoid pure red/green. Overspending should feel like a nudge from a friend, not a warning siren — that's the whole brand thesis.

**Dark mode:** not in scope for v1 — the calm-cream identity is core to the brand. If needed later, treat as a v2 exploration, not a simple color inversion.

---

## 4. Typography

Numbers/data get a **technical mono** font (precision, automation feel). Body text gets a **clean minimal sans**.

- **Numeric/Mono:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — slightly rounder terminals than a typical coding mono, feels more "smart product" than "terminal," while keeping the technical precision from your reference image.
- **Body:** [Manrope](https://fonts.google.com/specimen/Manrope) — soft, rounded, geometric. Same family used on your HWA portfolio, so Claroni stays visually consistent with your other branded work.

### Type Scale (web, rem / px base 16)

| Style | Font | Size | Weight | Line-height |
|---|---|---|---|---|
| Display (balance number) | Mono | 3rem / 48px | 500 | 1.1 |
| H1 | Body sans | 2rem / 32px | 700 | 1.2 |
| H2 | Body sans | 1.5rem / 24px | 700 | 1.3 |
| H3 | Body sans | 1.125rem / 18px | 600 | 1.4 |
| Body | Body sans | 1rem / 16px | 400 | 1.5 |
| Small / caption | Body sans | 0.875rem / 14px | 400 | 1.4 |
| Data / table numbers | Mono | 0.9375rem / 15px | 500 | 1.4 |
| Button label | Body sans | 0.9375rem / 15px | 600 | 1 |

**Mobile:** scale Display down to 2.25rem/36px, H1 to 1.5rem/24px; keep body/caption sizes the same (mobile screens need the same readability, not smaller text).

---

## 5. Shape & Geometry

- **Corner radius scale:** `4px` (chips/tags) · `12px` (buttons, inputs) · `20px` (cards) · `28px` (sheets/modals, large containers)
- Prefer **fully rounded** pill shapes for buttons and tags over slightly-rounded rectangles — reinforces "soft/organic" over "corporate/technical."
- Use one **organic accent shape** (soft blob, like the negative space in the logo's overlapping strokes) sparingly as a background decoration on empty states or onboarding — never behind dense data.
- No sharp corners anywhere in the UI. No drop shadows heavier than a soft 2–4% opacity blur — depth comes from color/surface contrast, not shadow.

---

## 6. Spacing & Layout

**Base unit:** 8px grid. All spacing/padding in multiples of 8 (4px allowed only for icon-to-label gaps).

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`

**Grid:**
- Web: 12-column, max content width 1200px, 24px gutters.
- Mobile: 4-column, 16px side margins, 16px gutters.

**Whitespace philosophy:** when in doubt, add more space, not more content. A screen with one card and generous margin beats a screen with three cards and no breathing room — this is the #1 brand differentiator vs. traditional banking apps.

---

## 7. Components

### Buttons
- **Primary:** filled `brand-primary`, white text, full pill radius, 48px height.
- **Secondary:** outline `border` color, `text-primary` label, same shape.
- **Ghost/text:** no border/fill, `brand-primary` text, used for low-emphasis actions ("Skip", "Not now").
- States: hover = `brand-primary-dark`; disabled = 40% opacity, no interaction.

### Balance Card (hero component)
- Large surface card, `surface` background, 20–28px radius.
- Balance number in **Mono Display** style, `text-primary`.
- Label above number in small caps or caption style, `text-secondary`.
- Optional trend chip (`positive`/`negative` token) top-right, pill-shaped.

### Transaction Row
- Icon/merchant avatar (rounded, 40px) — label (body sans) — amount (mono, right-aligned).
- Negative amounts in `negative` token, positive in `positive` token, never red/green pure hues.
- 16px vertical padding, divider `border` color between rows (no boxed cards per row — keep it a clean list).

### Proactive Insight Callout (signature component — this is the brand's "voice")
- Distinct from a system alert: soft `insight` background tint (10–15% opacity of the insight color over `surface`), rounded 20px, no icon-heavy warning styling.
- Copy always written in first-person-adjacent, direct voice: "You can't afford this today, but here's a cheaper alternative."
- One action max (e.g. a single ghost button "See alternative"), never a wall of options.

### Inputs
- 12px radius, `surface-alt` background, `border` outline, no heavy inner shadow.
- Focus state: `brand-primary` 2px outline, not a color-shift of the whole field.

### Navigation
- **Mobile:** bottom tab bar, 4–5 items max, icon + label, rounded active-state pill behind the selected icon.
- **Web:** left sidebar, generous vertical spacing between items, no dense icon-only rail — labels always visible (anti-clutter principle applies to nav too).

---

## 8. Iconography

- Rounded-line icon style (2px stroke, rounded caps/joins) — matches the organic logo strokes.
- No filled/solid icon sets, no sharp geometric icon packs.
- Suggested source: [Phosphor Icons](https://phosphoricons.com) (rounded weight) or [Lucide](https://lucide.dev).

---

## 9. Motion

- Soft ease-out curves only (`cubic-bezier(0.16, 1, 0.3, 1)` or similar), 200–300ms for most transitions.
- No bouncy/elastic easing, no jarring instant cuts.
- Insight callouts and new transactions should fade/slide in gently — never pop or shake, even for negative balance alerts (calm > alarming, always).

---

## 10. Voice & Microcopy Rules

**Do:**
- Short, direct sentences. "You spent 40% more on food this week."
- Offer one next step, not a menu of options.
- Speak like a smart friend, not a compliance department.

**Don't:**
- No corporate jargon ("leverage," "utilize," "optimize your financial journey").
- No fear-based framing ("WARNING: Low balance!!") — reframe as helpful ("You're closer to your limit than usual — here's what's driving it.").
- No exclamation-point enthusiasm — Claroni is calm, not hype-y.

---

## 11. How to Use This File in Claude Design

This is a single, locked default system — colors, fonts, spacing, and voice all apply automatically from this document. When generating a screen, just specify:
1. Which **component(s)** from Section 7 are involved
2. **Web or mobile** layout grid

No other decisions needed — everything else is fixed by this document.
