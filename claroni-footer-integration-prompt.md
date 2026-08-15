# Claroni — Footer Integration Prompt (for Claude Code)

**How to use this file:**
1. Open Claude Code in the project repo (the same repo where the landing page from `claroni-landing-page-code-prompt.md` was built).
2. Paste the full contents of `claroni-design-system.md` first (as context — do not skip this).
3. Then paste everything below this line as your request.

---

## Request for Claude Code

Replace the current footer on the Claroni landing page with the shadcn footer component below. Delete the existing footer entirely — don't keep it alongside the new one.

The component as given uses shadcn's default theme and Tailwind's built-in `dark:` system. **None of that default styling should ship as-is** — every color, radius, spacing, and font in it must be re-skinned to Claroni's locked design system before it's used. Treat the code below as a structural/functional starting point only, not a visual one.

### 1. Environment check

Before integrating, confirm the project supports:
- shadcn project structure
- Tailwind CSS
- TypeScript

If it doesn't, set these up first via the shadcn CLI (`npx shadcn@latest init`), then install Tailwind and TypeScript as needed. Confirm the default component path is `/components/ui` — if the project uses a different path, explain briefly why `/components/ui` is the convention worth switching to before continuing, rather than silently placing files elsewhere.

### 2. Component to integrate

Copy this to `/components/ui/footer-section.tsx`:

```tsx
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Facebook, Instagram, Linkedin, Send, Twitter } from "lucide-react"

function Footerdemo() {
  return (
    <footer className="relative border-t bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Stay Connected</h2>
            <p className="mb-6 text-muted-foreground">
              Join our newsletter for the latest updates and exclusive offers.
            </p>
            <form className="relative">
              <Input
                type="email"
                placeholder="Enter your email"
                className="pr-12 backdrop-blur-sm"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Subscribe</span>
              </Button>
            </form>
            <div className="absolute -right-4 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
            <nav className="space-y-2 text-sm">
              <a href="#" className="block transition-colors hover:text-primary">Home</a>
              <a href="#" className="block transition-colors hover:text-primary">About Us</a>
              <a href="#" className="block transition-colors hover:text-primary">Services</a>
              <a href="#" className="block transition-colors hover:text-primary">Products</a>
              <a href="#" className="block transition-colors hover:text-primary">Contact</a>
            </nav>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">Contact Us</h3>
            <address className="space-y-2 text-sm not-italic">
              {/* CONTENT NEEDED — see note below, do not fill this in with placeholder text */}
            </address>
          </div>
          <div className="relative">
            <h3 className="mb-4 text-lg font-semibold">Follow Us</h3>
            <div className="mb-6 flex space-x-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" asChild>
                      <a href="#"><Facebook className="h-4 w-4" /><span className="sr-only">Facebook</span></a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Follow us on Facebook</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" asChild>
                      <a href="#"><Twitter className="h-4 w-4" /><span className="sr-only">X</span></a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Follow us on X</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" asChild>
                      <a href="#"><Instagram className="h-4 w-4" /><span className="sr-only">Instagram</span></a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Follow us on Instagram</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" asChild>
                      <a href="#"><Linkedin className="h-4 w-4" /><span className="sr-only">LinkedIn</span></a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Connect with us on LinkedIn</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-center md:flex-row">
          <p className="text-sm text-muted-foreground">© 2026 Claroni. All rights reserved.</p>
          <nav className="flex gap-4 text-sm">
            <a href="#" className="transition-colors hover:text-primary">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-primary">Terms of Service</a>
            <a href="#" className="transition-colors hover:text-primary">Cookie Settings</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export { Footerdemo }
```

Note what changed from the original snippet I was given, already applied above — implement it this way, don't reintroduce the removed pieces:
- The dark/light `Switch` + `Sun`/`Moon` toggle and its `isDarkMode` state/`useEffect` are **removed from this component entirely** — see Section 4 below, it moves to the nav.
- The `Contact Us` block is left empty on purpose — see Section 5 below.
- Social links point to `Facebook`, `X` (was `Twitter`), `Instagram`, `LinkedIn` — icon and tooltip label already updated for X.
- All social/quick links use `href="#"` — functional-looking, but not wired to real destinations yet, same placeholder convention as the CTA buttons elsewhere on the page.

### 3. Dependencies

Copy these to `/components/ui/` if not already present: `button.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `tooltip.tsx` (standard shadcn versions — generate via `npx shadcn@latest add button input label textarea tooltip` rather than hand-pasting, so they stay update-friendly). `switch.tsx` is still needed too, for the nav toggle in Section 4.

Install npm dependencies:
```bash
npm install lucide-react @radix-ui/react-slot class-variance-authority @radix-ui/react-label @radix-ui/react-switch @radix-ui/react-tooltip
```

### 4. Move the dark/light toggle to the navigation bar

Take the `Sun` / `Switch` / `Moon` toggle out of the footer and add it to the site's top nav bar instead (alongside the logo and "Get started" button).

**Important scope flag before implementing this:** the design system explicitly states dark mode is *not in scope for v1* — no dark-mode color tokens exist yet. Build the toggle as a real, working UI control (styled with the design system's pill/switch treatment), but until Honzis defines an actual dark palette, toggling it may have no visible effect beyond flipping a `dark` class with nothing meaningful attached to it. Treat this as: ship the control now, hold off on building a full second color theme until that's explicitly requested — don't invent dark-mode colors yourself.

### 5. Contact Us — ask, don't guess

Do not fill the `address` block with placeholder content (no invented street address, phone number, or email). Before finalizing this section, ask Honzis directly what should go there — physical address, phone, support email, or just `hello@claroni.com` from the footer tagline used elsewhere on the page. Leave the block empty (or a clearly marked TODO) until you have an answer.

### 6. Claroni re-skin — required token mapping

Replace every shadcn default class with the equivalent design-system value. At minimum:

| shadcn default | Replace with |
|---|---|
| `bg-background` / `text-foreground` | `bg-base` (`#F1E9D6`) / `text-primary` (`#2B2117`) |
| `text-muted-foreground` | `text-secondary` (`#8A7A65`) |
| `border-t` (border color) | `border` (`#E3D8C2`) |
| `bg-primary text-primary-foreground` (subscribe button) | `brand-primary` (`#785438`) fill, white text, hover → `brand-primary-dark` (`#5E4128`) |
| `hover:text-primary` (links) | hover → `brand-primary` |
| Input (email field) | `surface-alt` (`#FFFFFF`) background, `border` outline, 12px radius, focus state = 2px `brand-primary` outline — per the design system's Inputs spec, not shadcn's default focus ring |
| Icon buttons (social) | outline variant using `border` token, `text-primary` icon color, **full pill radius** (already close to this by default — keep it that way) |
| Tooltip | `surface` background, `text-primary` text, no heavy shadow (2–4% opacity max) |
| All headings/body text | Manrope, per the type scale in Section 4 of the design system |
| Spacing (gaps, padding) | snap to the 8px grid (`4·8·12·16·24·32·48·64`) rather than Tailwind's default spacing scale where they don't already match |
| Motion (`transition-colors duration-300`, button `hover:scale-105`) | fine to keep as a subtle interaction, but ease curve should match the design system's soft ease-out, not a linear/default Tailwind ease |

No new colors, radii, or fonts outside this table and the design system file — if something isn't covered above, resolve it by finding the nearest matching token rather than picking a new value.

### 7. Placement

This footer goes at the very end of the landing page (after the closing CTA section), replacing whatever footer is currently there. It supersedes the simpler footer described in the earlier landing-page prompt — use this richer version instead.

---

## Output

Implement this as working code in the existing project — real components, real (if placeholder) links, real state for the nav toggle — not a static mockup. Ask about the Contact Us content before shipping that block; everything else can be built now.
