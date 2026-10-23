---
name: Bharosa
description: Trusted home help for Pakistani families and workers; a category-standard services app where trust is the loudest element.
colors:
  brand: "#087f5b"
  brand-dark: "#06684a"
  brand-soft: "#e7f5ee"
  brand-softer: "#f3faf6"
  brand-ink: "#ffffff"
  accent: "#a15c07"
  accent-soft: "#fdf3dc"
  ink: "#111827"
  ink-2: "#374151"
  muted: "#6b7280"
  bg: "#f6f7f9"
  surface: "#ffffff"
  surface-2: "#f1f3f5"
  line: "#e5e7eb"
  line-2: "#d1d5db"
  info: "#1d4ed8"
  info-soft: "#eef4ff"
  warn: "#b4410c"
  warn-soft: "#fff1e8"
  danger: "#b42318"
  danger-soft: "#fdeeec"
typography:
  display:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2.2rem, 5.2vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  card-title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.25
  stat:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.9rem"
    fontWeight: 700
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  body-urdu:
    fontFamily: "Figtree, Noto Nastaliq Urdu, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 2.1
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 600
    lineHeight: 1.4
  badge:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  sm: "10px"
  md: "16px"
  modal: "20px"
  band: "24px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "16px"
  card: "18px"
  lg: "24px"
  xl: "32px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.brand-dark}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
  button-accent:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-sm:
    padding: "6px 13px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "7px 15px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "11px 13px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.card}"
  badge-verified:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-dark}"
    typography: "{typography.badge}"
    rounded: "{rounded.pill}"
    padding: "4px 10px 4px 8px"
  badge-team-endorsed:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    typography: "{typography.badge}"
    rounded: "{rounded.pill}"
    padding: "4px 10px 4px 8px"
  face:
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "30px"
  face-team:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    size: "30px"
  nav-link-active:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-dark}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  band:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.band}"
    padding: "28px 30px"
---

# Design System: Bharosa

All tokens live as CSS custom properties on `:root` in `src/styles.css`. Use `var(--brand)`, `var(--radius)` and so on; never paste the hex.

## Overview

**Creative North Star: "Trust, Played Straight"**

Bharosa looks like the best of today's services apps (Careem, Urban Company, Airbnb, LinkedIn) with no themed costume. White cards sit on a cool grey ground, near-black ink carries the words, and one deep green marks every primary action and every verification. The loudest thing on any worker is their trust: police-verified badge, CNIC custody, team endorsement, and a row of stacked family faces.

Density runs from roomy (landing, worker screens on phones) to dense and calm (staff tables). Motion is small and earned: a headline reveal, a card spotlight, count-ups, a success check. Everything has to run well on a cheap Android phone over patchy data, and has to read correctly in Urdu Nastaliq, right to left.

**Key Characteristics:**
- One green for action and verification; amber kept for the team endorsement badge only; warnings use a separate burnt orange.
- Pill buttons, chips, badges and nav; 16px cards; 10px inputs.
- Soft, ambient two-layer shadows; no hard edges.
- Figtree for Latin, Noto Nastaliq Urdu for Urdu, with taller line-heights in RTL.
- Round initials avatars in deep colours, stacked with a white ring.

## Colors

A cool neutral canvas, one green voice, and status tints that are always a soft background plus a dark text of the same hue.

### Primary
- **Bharosa Green** (brand): primary buttons, links, focus ring (3px at 22% alpha), caret, checkboxes, active tab underline, the team "B" face, verified icons in hero proof.
- **Deep Green** (brand-dark): hover for primary, text on green tints (active nav, verified badge, ok pills).
- **Mint Wash / Mint Mist** (brand-soft / brand-softer): verified badge and ok pill backgrounds, active nav pill, selected role tile, "my" message bubble.

### Secondary
- **Endorsement Amber** (accent / accent-soft): the "Team endorsed" badge, the accent callout and the highlighted card ring (`#f0d7a0` border plus a 3px accent-soft ring). Warnings (warn, #b4410c) are a separate burnt orange, used for "Badge suspended" and warn pills.

### Tertiary
- **Record Blue** (info / info-soft): CNIC-held badge, info pills and callouts, pending-approval notes.
- **Signal Red** (danger / danger-soft): danger buttons, error callouts, error toasts, notification dot, tab counts.

### Neutral
- **Ink** (ink): headings, body, selected chips, the dark "accent" button, the landing band, ok toasts, staff banner.
- **Slate** (ink-2): secondary text, chip text, field labels, lead copy.
- **Grey** (muted): meta lines, hints, inactive nav and tabs, empty states.
- **Cool Paper** (bg): page ground. **White** (surface): cards, inputs, top bar, bottom nav, modals. **Mist** (surface-2): hover fills, neutral pills, "their" bubble, +N face.
- **Hairline / Rule** (line / line-2): card and section borders / input, chip and ghost-button borders.

### Named Rules
**The One Green Rule.** Green means "act" or "verified". Never use it for decoration, and never introduce a second brand hue.

**The Tint Pair Rule.** Status always pairs a soft background with the dark text of the same hue (verified, CNIC, endorsed, suspended, pills, callouts). No solid status fills except danger buttons and toasts.

**The Deep Face Rule.** Initials avatars use only the eight deep palette colours in `FACE_COLORS` (`src/ui.tsx`), all at least 4.5:1 with white, picked by a stable hash of the name.

## Typography

**Display Font:** Figtree (with system-ui, -apple-system, Segoe UI, Roboto)
**Urdu Font:** Noto Nastaliq Urdu, added to the stack under `html[dir="rtl"]`
**Mono:** ui-monospace stack, staff codes only

**Character:** One friendly geometric sans at bold weights for everything Latin; Nastaliq for Urdu with generous leading so diacritics never clip. Loaded from Google Fonts with `display=swap` (Figtree 400 to 800, Nastaliq 400/600/700).

### Hierarchy
- **Display** (700, clamp 2.2 to 3.6rem, 1.04, -0.035em): landing hero headline only.
- **Headline** (700, 1.75rem, 1.45rem under 760px): page titles (h1).
- **Title** (700, 1.2rem): section headings (h2); h3 is 1.02rem.
- **Card title** (700, 1.05rem): worker names and card titles.
- **Stat** (700, 1.9rem, tabular figures): dashboard numbers.
- **Body** (400, 16px, 1.55): copy; page subtitles cap at 70ch, landing lead at 34em.
- **Label** (600, 0.88rem): field labels, chips, meta; nav and tabs at 0.92rem.
- **Badge / pill** (700, 0.78rem / 0.74rem): trust badges and status pills. Table headers are the only uppercase text (0.74rem, 0.05em tracking).

### Named Rules
**The Western Digits Rule.** Money, stats and tables use tabular figures and Western digits in both languages (`Rs 42,000` / `42,000 روپے`). In RTL, `.money`, `.stat-value`, phone, number and password inputs switch back to Figtree and LTR.

**The Tall Urdu Rule.** In RTL: body 15px at 2.1 line-height; headings 1.9 with zero tracking; hero display clamp(1.7rem, 4.2vw, 2.5rem); buttons, pills, badges, chips, tabs, inputs get line-height 1.9 to 2 with extra bottom padding. Never apply negative tracking to Urdu.

## Layout

- Container: 1200px max, 20px side padding (16px on phones). Main has 28px top padding and 96px bottom room (100px on phones) for the bottom nav.
- Rhythm: 8px inside groups, 16px between cards and form fields, 24px between split columns, 32px between page sections, 64px between landing sections. Cards pad 18px.
- Grids: worker cards `auto-fill, minmax(290px, 1fr)`; stats `minmax(170px, 1fr)`; detail pages split 2fr/1fr and stack under 860px.
- Breakpoints: 1100px hides the top-bar name; 860px stacks splits, hero and "how it works"; 760px swaps top pill nav for a fixed bottom tab bar (icon over 0.72rem label, safe-area padding) and turns modals into bottom sheets; 420px hides the wordmark.
- Use logical properties (`margin-inline-start`, `inset-inline-end`, `border-end-end-radius`) everywhere so RTL mirrors for free.

## Elevation & Depth

Soft and ambient. Every card carries one quiet two-layer shadow; hover lifts linked cards 2px onto the larger shadow. Overlays get one deep shadow. Depth never comes from hard edges or offset shadows.

### Shadow Vocabulary
- **Rest** (`--shadow`: `0 1px 2px rgba(17,24,39,.05), 0 4px 16px rgba(17,24,39,.06)`): cards, search bar, tables.
- **Lift** (`--shadow-lg`: `0 2px 6px rgba(17,24,39,.06), 0 16px 40px rgba(17,24,39,.1)`): hovered card links, toasts.
- **Green press** (`0 1px 2px rgba(6,104,74,.25), 0 4px 12px rgba(8,127,91,.18)`): primary buttons only; ghost and link buttons are flat.
- **Overlay** (`0 24px 64px rgba(17,24,39,.25)`): modals.
- **Focus ring** (`--ring`: `0 0 0 3px rgba(8,127,91,.22)`): every focusable element via `:focus-visible`; inputs also turn the border green.

### Named Rules
**The One Shadow Rule.** A surface gets `--shadow` at rest and `--shadow-lg` on hover. Do not invent new shadow values for new cards.

## Shapes

Rounded and friendly. Anything you press or that labels status is a full pill (999px): buttons, chips, badges, pills, nav links, search bar, icon buttons. Containers are 16px (cards, tables, empty states); inputs, callouts and role tiles are 10px; modals are 20px (top corners only as a phone sheet); the landing band is 24px. Avatars and faces are circles. Borders are 1px hairlines; the empty state alone uses a dashed border.

## Components

### Buttons
- **Shape:** pill (999px), 700 weight at 0.94rem, 10px by 18px; small is 6px by 13px at 0.85rem.
- **Primary:** green with white text and the green press shadow; hover to deep green; press nudges down 1px; disabled at 50% opacity, no shadow.
- **Ghost:** white with a line-2 border, ink text, flat; hover to Mist. The usual partner to a primary.
- **Accent:** solid ink, for strong non-brand actions. **Danger / danger-ghost:** red solid or red text on white with a pale red border. **Link:** green text, no box.
- Icons (lucide) sit after the label at 18px with an 8px gap.

### Chips
- **Style:** white pill, line-2 border, slate 600 text at 0.88rem, 7px by 15px.
- **State:** selected (`aria-pressed="true"`) inverts to solid ink with white text. Used for category and trust filters.

### Cards / Containers
- **Corner Style:** 16px. **Background:** white on Cool Paper. **Border:** 1px hairline. **Shadow:** Rest, Lift on hover for links. **Padding:** 18px.
- **Highlighted:** amber border plus a 3px amber-soft ring, for the item that needs attention.
- **Callouts:** 10px, tint background, tinted border, dark same-hue text; can hold a small ghost action.

### Inputs / Fields
- **Style:** white, line-2 border, 10px radius, 11px by 13px; label above (600, 0.88rem, slate), hint below (0.8rem, grey).
- **Focus:** border turns green plus the focus ring. Hover darkens the border. Disabled fills Mist.
- **Search bar:** pill container with Rest shadow, search icon, borderless input and a city select split by a hairline; the whole bar takes the ring on focus.

### Navigation
- **Top bar:** sticky, white at 94% with a light blur, hairline bottom. Pill links in grey 600; hover fills Mist; active is Mint Wash with deep green text.
- **Phone (under 760px):** fixed bottom tab bar, 22px icons over labels, active tab Mint Mist with deep green.
- **Tabs:** grey 600 labels with a 2px green underline when active; red count pill for pending items.

### Trust badges (signature)
Strongest signal first: Police verified (green tint, ShieldCheck), Badge suspended (amber tint, ShieldAlert), CNIC held by team (blue tint, IdCard), Team endorsed (amber tint, BadgeCheck). A worker with none shows a neutral "New, not yet verified" pill. Icons are lucide at 14px. Family endorsements are never a badge.

### Endorsement stack (signature)
LinkedIn-style: up to four 30px circular faces (38px in the large variant) overlapping by 10px (12px), each with a 2px white ring and a faint shadow, then a sentence such as "Endorsed by **Sana Malik** and 3 other families". The team's endorsement is a green "B" face placed first; extra endorsers collapse to a Mist "+N" face. Sentences are whole i18n templates with `{name}` and `{team}` slots so Urdu can order the words naturally; never build them by joining fragments.

### Worker card (signature)
Avatar (52px) beside name and skills/experience meta; trust badges; a two-line clamped bio; the endorsement stack; then a hairline footer with map-pin location (ellipsis) on the start side and the monthly wage on the end side.

### Feedback
Modals fade in the backdrop (0.15s) and rise the panel 8px (0.2s, `cubic-bezier(0.16, 1, 0.3, 1)`); on phones they become bottom sheets. Toasts rise from above the bottom nav: ink for success, red for errors. Spinner is a 18px ring with a green arc.

### Motion
State transitions are 0.15s ease (colour, border, shadow); card lift 0.2s. React Bits pieces in `src/components/reactbits/` (MIT + Commons Clause, provenance in its README) are the only richer motion: BlurText (landing headline), SpotlightCard (landing example cards), ShinyText (landing worker band), CountUp (staff numbers), StatusMark (success checks). Each checks `prefers-reduced-motion`, and a global rule cuts all CSS animation and transition to 0.01ms under reduced motion.

## Do's and Don'ts

### Do:
- **Do** use the CSS custom properties for every colour, radius, shadow and the focus ring.
- **Do** pair a primary green pill with a ghost pill when there are two actions.
- **Do** show trust in the fixed order: verified, suspended, CNIC, team endorsed, then the face stack.
- **Do** use logical properties and test every worker-facing screen in Urdu (`dir="rtl"`).
- **Do** use lucide icons with `aria-hidden` beside a text label.
- **Do** keep motion to CSS transitions and the existing React Bits pieces, and honour reduced motion.
- **Do** design for low-end Android first: system-font fallbacks, no large media on worker screens, CSS over JS animation.

### Don't:
- **Don't** add a second brand colour, or use green or amber for decoration.
- **Don't** add WebGL, 3D or heavy animated backgrounds; React Bits additions must be as light as the current five.
- **Don't** invent ratings, counts, testimonials or photos; until real photos exist, workers are initials avatars.
- **Don't** add a Pakistani "theme" (truck art, patterns, nostalgia) or stack decorative badges.
- **Don't** use negative letter-spacing or tight line-height on Urdu text, or Eastern Arabic digits for money.
- **Don't** use hard offset shadows, sharp corners on pressable controls, or new shadow values.
- **Don't** build endorsement or count sentences by joining translated fragments.
