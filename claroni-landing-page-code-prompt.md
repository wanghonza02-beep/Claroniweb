# Claroni — Landing Page Prompt (for Claude Code)

**How to use this file:**
1. Open Claude Code in the project repo.
2. Paste the full contents of `claroni-design-system.md` first (as context — do not skip this, it is the locked, non-negotiable source of truth for every visual decision).
3. Then paste everything below this line as your request.

---

## Request for Claude Code

Build a brand-new marketing landing page for **Claroni**, an automated finance-clarity app for students and early-stage founders with irregular income. This is a from-scratch build — there is no existing homepage to preserve, migrate, or reference. Do not reuse any prior scroll-snap/slide-based structure.

### Non-negotiable constraints

1. **Design system is locked.** Every color, font, radius, spacing value, shadow rule, icon style, and voice/microcopy rule comes from `claroni-design-system.md`, pasted above this prompt. Do not introduce any color, typeface, shape language, icon set, or tone that isn't already defined there. If something in this brief is ambiguous, resolve it using the design system, not your own aesthetic judgment.
2. **Continuous scroll, not scroll-snap.** Build this as a normal, continuously scrolling page with sections of varying height — not a full-viewport "one idea per screen" slide deck.
3. **No fabricated proof.** Claroni has no live users, testimonials, or usage stats yet. Do not invent numbers, quotes, or social proof ("10,000 users," "4.9 stars," fake testimonials, etc.). Every claim on the page must come from the copy blocks below or be clearly presentational (e.g. example UI data, which is fine — the design system already uses illustrative balances like `$1,842.30`).
4. **CTAs are placeholders for now.** Every "Get started" / CTA button should be fully styled and functional-looking, but should not link anywhere real yet (`href="#"` or a clear `// TODO: wire up signup flow` comment). Do not invent a signup form, payment flow, or route — that comes later.
5. **Voice stays calm.** Follow Section 10 of the design system exactly: short direct sentences, one next step at a time, no corporate jargon, no fear-based framing, no exclamation-point hype — even where the reference sites below lean into urgency or stat-heavy bravado.

---

## Structural inspiration — read carefully, this is about layout logic only

I like the *pacing and information architecture* of these three sites. I do **not** want their visual style:

- https://ouraring.com/
- https://www.lassie.ai/
- https://www.biograph.com/

**What to take from them (structure/rhythm only):**
- A short, confident hero: one big declarative headline, one short subhead, a single CTA — no clutter, no scroll indicator games.
- Proof or context placed *immediately* after the hero, not buried mid-page — these sites never make you scroll far to understand who the product is for and why it matters.
- A distinct "how it works" section broken into 3 clear steps, each paired with a supporting visual.
- One moment in the page dedicated to a single bold, isolated statement/callout (Lassie's "98% of posting is handled autonomously," Biograph's "96%" stat block) — a beat where the page slows down and makes one point with maximum visual confidence.
- A structured comparison/differentiation section (Biograph's "four pillars" grid rhythm) — clear category-by-category contrast.
- A closing section that restates the mission in one strong line before the final CTA, followed by a clean, unfussy footer.

**What NOT to take from them (explicitly excluded):**
- Their color palettes, photography, dark/moody or clinical visual tone, iconography, or typography — Claroni uses only what's in the design system.
- Sharp-edged cards, drop shadows, or dense stat/testimonial walls (Biograph in particular is very proof-heavy and dense — Claroni should stay sparse per the design system's whitespace philosophy).
- Any literal copy, layout grid dimensions, or component styling from these sites — treat them purely as a reference for *pacing and section logic*, then rebuild every section with Claroni's own content and components.

Think of it as: same information rhythm, completely different body.

---

## Above-the-fold priority (this is the main ask)

The person landing on this page must understand, **without scrolling past the first two sections**:
1. **Who this is for** — students and early-stage founders with irregular income.
2. **Why it exists** — traditional finance apps assume a stable paycheck; Claroni doesn't.
3. **What it is** — an automated finance tracker that auto-syncs a card and turns transactions into one clear insight.
4. **Why someone would pay for it** — zero effort, zero anxiety, one thing that matters shown at a time.

Don't make the visitor dig for this. It should be resolved in the hero and the section immediately following it.

---

## Section-by-section content brief

### 1. Navigation
Simple, uncluttered row: Claroni wordmark/logo on the left, a single "Get started" pill button on the right. No dense link list — this is a pre-launch marketing page, not a full product site with Pricing/Security/Company menus. If a second link is needed, one ghost-style "Log in" text link is enough.

### 2. Hero
This carries the full "who + why" weight, so it should not be a generic tagline.
- Eyebrow (small mono label, `text-secondary`): something like "For students & early-stage founders"
- Headline (large, Manrope Bold): **"Finance apps weren't built for people whose money is unpredictable."**
- Subhead: **"Built for a stable paycheck. Not for you."** — or blend with: *"Students and early founders live with irregular income and constant context-switching. Most finance apps are still designed for a stable paycheck and a mortgage."*
- CTA: pill button, "Get started" (placeholder link per constraints above)
- Supporting visual: a Balance Card / transaction-list mockup using the design system's real components — show the contrast directly, e.g. a muted "every other app" transaction list (Coffee Shop –$4.75, Campus Bookstore –$62.10, Freelance Deposit +$310.00) next to a calm Claroni "Where you stand" card reading **$243.90 — Safe to spend through Friday**. This single visual *is* the differentiation argument — let it do a lot of the work.

### 3. Mission statement (the "why," isolated)
A single-statement section, generous whitespace, could use `brand-primary` as a full-bleed background per the design system (this is the one place a bold color block is appropriate).
- Headline: **"Financial clarity shouldn't require effort — or anxiety."**
- Subhead: **"Knowing comes before worrying."**
No CTA needed here — this section's job is emotional clarity, not conversion.

### 4. How it works
Three-step section, each step paired with a small icon (Phosphor/Lucide, rounded, per design system) and a supporting UI snippet:
- **01 — Sync:** Connect your card once.
- **02 — Understand:** Every transaction, one insight.
- **03 — Act:** Told what to do next.
Frame it as: "One loop, running quietly in the background."

### 5. Feature spotlight — anti-clutter proof
This is the "isolated bold moment" borrowed structurally from the inspiration sites, rebuilt with Claroni's actual signature component (the Balance Card + Proactive Insight Callout).
- Headline: **"One balance. One insight. Nothing else competing for your attention."**
- Visual: Balance Card showing `$1,842.30` with a `+12%` trend chip, paired with one Proactive Insight Callout below it — pick one, don't show both variants: either the calm "You've got room to spare this week — no action needed" or the nudging "You're spending faster than usual this week. Slow down on takeout and you'll clear the month fine. → See the details." The nudging version is more true to the brand's "honest friend" voice, so prefer it if you can only fit one.

### 6. Comparison — differentiation
Structured, category-by-category contrast section, no dense grid — keep it to short paired rows per the anti-clutter philosophy.
- Headline: **"Less data. More clarity."**
- Rows:
  - *Traditional banking apps — show everything, explain nothing.* → **Claroni: shows one thing that matters, right now.**
  - *Budgeting apps (manual entry) — require setup and daily discipline.* → **Claroni: fully automated, zero ongoing effort.**
  - *Generic fintech tools — built for a stable-income user.* → **Claroni: built for irregular income — students and early founders, specifically.**

### 7. FAQ (recommended, keep sparse)
A short accordion — 4–6 questions max, matching the calm/direct voice. Draft placeholder questions Claude Code can refine, e.g.: How does the card sync work? Is my data secure? What does Claroni cost? Can I cancel anytime? Keep answers to 1–2 short sentences each — no walls of text, per the design system's anti-clutter rule.

### 8. Closing CTA
One last mission-driven line before the footer, mirroring the deck's closing framing:
- **"Automated finance clarity, without the clutter."**
- CTA: pill button, "Get started" (placeholder)

### 9. Footer
Minimal: Claroni logo + wordmark, tagline ("Automated finance clarity, without the clutter."), contact (`hello@claroni.com`), and a light row of legal/social placeholders. No dense multi-column footer — this is a pre-launch page, keep it proportional to how little there is to link to yet.

---

## Technical notes

- Check the existing repo for an established stack/conventions before choosing tooling; if none exists yet for this fresh build, default to something simple and fast (plain HTML/CSS/JS, or whatever lightweight framework is already used elsewhere in the project) — nothing heavier than the "ultra-minimalist" brand needs.
- Motion: soft ease-out only, 200–300ms, gentle fade/slide-in on scroll for section reveals — per Section 9 of the design system. No bounce, no jarring cuts, no shader/glitch effects.
- Responsive: mobile-first is fine, but design for desktop-width (1440px) as the primary canvas per the design system's grid rules; scale typography per the design system's mobile type-scale notes.
- Accessibility: respect color contrast even within the cream/brown palette — check text-on-surface combinations against the tokens provided.

## Output

Build this as a real, working page (not a static mockup image) using the section order above, top to bottom. Visual execution (exact layout choices within these constraints) will be iterated on together after this first pass — treat this as a strong first draft to react to, not a final pixel-locked spec.
