# CalTrack AI — Design System Spec (v1, Decision Document)

Status: **Decided.** This is the token source of truth for the rebuild. It replaces the monochrome Lovable palette in `src/index.css` and the ad-hoc ~110 hardcoded Tailwind color literals. Every decision below is final unless overturned by an A/B result.

---

## 1. Design Language

**Three adjectives: Fresh. Assured. Kind.**

**Art direction.** CalTrack is a light-first, food-forward interface: near-white warm canvas, white elevated cards with soft diffuse shadows, and food photography treated as the hero content — the UI recedes so plates look appetizing (the Cal AI/Yazio lane, deliberately opposite WHOOP/Oura's dark athlete aesthetic). Color is a strict two-layer system: four macro *identity* hues (protein coral, carbs amber, fat violet, fiber teal) plus water sky-blue, and a separate *semantic* layer where green means on-track and amber means near-limit — and, per our adherence-neutral stance, **red is never used for going over calories**, only for destructive actions. Hierarchy is carried by big-number typography (a 64px display numeral is the anchor of every screen), not by decoration. Motion is quick, physical, and celebratory at the right moments — confetti in real color, rings that fill on mount, numbers that count up — and boring everywhere else. Tone of the whole system: a sharp, warm coach who never shames. No emoji-as-iconography; lucide icons only, with three designed illustration spots (empty log, scan intro, weekly recap).

---

## 2. Color System — paste into `src/index.css`

Light mode is the primary and only launch theme. We are **stripping the 21 stale `dark:` classes and shipping light-only for v1**; the token architecture below is dark-ready (every color is a token) so dark mode is a v2 flag, not a rewrite.

```css
:root {
  /* ── Surfaces ─────────────────────────────────── */
  --background: 40 30% 98%;        /* warm off-white canvas */
  --card: 0 0% 100%;               /* pure white cards — food photos pop */
  --card-hover: 40 20% 97%;
  --popover: 0 0% 100%;
  --sheet: 0 0% 100%;
  --overlay: 24 10% 10% / 0.4;     /* scrim behind sheets/dialogs */

  /* ── Text hierarchy (warm gray ramp) ──────────── */
  --foreground: 24 10% 10%;        /* primary text, hero numerals */
  --text-secondary: 25 6% 38%;     /* labels, body copy */
  --muted-foreground: 25 5% 52%;   /* captions, timestamps */
  --text-disabled: 25 5% 68%;

  /* ── Borders / lines ──────────────────────────── */
  --border: 30 12% 90%;
  --border-strong: 30 10% 82%;
  --input: 30 12% 90%;
  --ring: 152 55% 34%;             /* focus ring = brand */

  /* ── Brand ─────────────────────────────────────── */
  --primary: 152 55% 30%;          /* "Basil" deep green — CTAs, FAB, active nav */
  --primary-foreground: 0 0% 100%;
  --primary-soft: 152 45% 94%;     /* tinted chips/backgrounds */
  --accent: 152 55% 40%;
  --accent-foreground: 0 0% 100%;

  /* ── Nutrient identity hues (layer 1) ─────────── */
  --calories: 24 10% 10%;          /* calories stay neutral ink — never a hue */
  --calories-track: 30 12% 91%;    /* empty ring track */
  --protein: 12 78% 52%;           /* coral */
  --protein-soft: 12 80% 95%;
  --carbs: 38 94% 46%;             /* amber */
  --carbs-soft: 40 92% 94%;
  --fat: 258 68% 60%;              /* violet */
  --fat-soft: 258 70% 96%;
  --fiber: 172 55% 34%;            /* teal */
  --fiber-soft: 172 45% 94%;
  --water: 199 89% 44%;            /* sky */
  --water-soft: 199 85% 95%;

  /* ── Semantic status (layer 2 — states only) ──── */
  --success: 152 60% 34%;
  --success-soft: 152 45% 93%;
  --warning: 38 92% 42%;           /* "near limit" — informational, never shaming */
  --warning-soft: 40 92% 93%;
  --destructive: 4 72% 50%;        /* delete/danger ONLY. Never for over-calorie states */
  --destructive-foreground: 0 0% 100%;
  --info: 199 89% 40%;
  --info-soft: 199 85% 95%;

  /* ── Special ──────────────────────────────────── */
  --streak: 24 94% 50%;            /* flame orange */
  --streak-soft: 26 95% 94%;
  --confidence-high: 152 60% 34%;
  --confidence-med: 38 92% 42%;
  --confidence-low: 25 5% 52%;     /* low confidence is gray, not red — honesty, not alarm */

  /* ── shadcn passthrough ───────────────────────── */
  --secondary: 40 20% 95%;
  --secondary-foreground: 24 10% 10%;
  --muted: 40 20% 95%;

  /* ── Chart tokens (used by Recharts, replaces gray chart-1..5) ── */
  --chart-calories: var(--foreground);
  --chart-goal-line: 25 5% 60%;
  --chart-under: 152 45% 55%;
  --chart-on-target: 152 60% 34%;
  --chart-over: 38 92% 46%;        /* over = amber, NOT red */
  --chart-grid: 30 12% 92%;

  --radius: 1rem;                  /* base 16px; see §4 */
}
```

Rules of use (enforced in code review):
1. **No raw Tailwind palette classes** (`text-green-600` etc.) anywhere outside this file. Extend `tailwind.config.ts` with `protein/carbs/fat/fiber/water/success/warning/streak` color keys mapped to these vars.
2. Semantic layer never mixes with identity layer: a protein bar is always coral even when the target is met; "target met" adds a `--success` check icon, not a recolor.
3. Delete `--gradient-*` and unused keyframes from the current file. Delete `App.css`.

---

## 3. Typography

**Decision: two Google Fonts, loaded via `<link>` with `display=swap`, self-host by GA.**

- **Display / numerals: `Space Grotesk`** (weights 500, 700). Used exclusively for hero numbers, ring centers, stat values, chart value labels. Always with `font-feature-settings: "tnum"` (tabular numerals) so counting numbers don't jitter.
- **UI / body: `Inter`** (variable, weights 400–700). Everything else. `tnum` on any inline data (macro chips, timestamps).

Type scale (define as Tailwind `fontSize` entries; px @ default 16px root):

| Token | Size/Line | Weight | Family | Use |
|---|---|---|---|---|
| `display-xl` | 64/68, -0.02em | 700 | Space Grotesk | Hero ring center ("1,247") |
| `display-lg` | 40/44, -0.02em | 700 | Space Grotesk | Plan-reveal number, weekly recap stat |
| `display-md` | 28/32, -0.01em | 700 | Space Grotesk | Card stat values, scan total kcal |
| `title` | 20/28 | 600 | Inter | Page titles, sheet headers |
| `heading` | 17/24 | 600 | Inter | Card titles, section headers |
| `body` | 15/22 | 400 | Inter | Default copy |
| `label` | 13/18 | 500 | Inter | Chip text, macro labels, nav labels |
| `caption` | 12/16 | 500 | Inter | Timestamps, units, footnotes; `--muted-foreground` |
| `micro` | 11/14, +0.04em, uppercase | 600 | Inter | Overlines ("PROTEIN"), badge text |

Big-number style, exactly: hero calories-left = `Space Grotesk 700, 64px, tracking -0.02em, hsl(var(--calories))`, with the unit ("kcal left") as `caption` in `--muted-foreground` 4px below. Number always count-up animates on mount (§6).

---

## 4. Spacing, Radius, Shadow

**Spacing:** 4px base grid. Allowed steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Page gutter: **16px** mobile, 24px ≥640px. Card internal padding: **16px** (dense lists) / **20px** (hero card). Vertical rhythm between dashboard cards: **12px**. Content column: `max-w-md (448px) mx-auto` — we commit to a true phone-width column even on desktop (own the mobile-web lane; no fake desktop layout in v1).

**Radius — three values only, delete the rest:**
- `--radius-card: 20px` — all cards, sheets (top corners 24px), dialogs
- `--radius-control: 12px` — buttons, inputs, tabs, list thumbnails
- `--radius-full: 9999px` — chips, pills, FAB, progress bars, avatars

**Shadows — two levels only:**
```css
--shadow-card: 0 1px 2px hsl(24 10% 10% / 0.04), 0 4px 16px hsl(24 10% 10% / 0.05);
--shadow-raised: 0 2px 4px hsl(24 10% 10% / 0.06), 0 12px 32px hsl(24 10% 10% / 0.10); /* FAB, sheets, popovers */
```
Cards = `bg-card` + `--shadow-card` + **1px border `--border`**. This is the single card treatment; the current 4 variants (`border-border/50`, `border-0 shadow-sm`, `backdrop-blur`, plain) are all retired. No glassmorphism except optional `backdrop-blur-lg bg-card/85` on the bottom nav only.

---

## 5. Component Specs

### 5.1 Bottom Nav
- Fixed bottom bar, height **64px + env(safe-area-inset-bottom)**; add `viewport-fit=cover` to the viewport meta and define the safe-area utility (it's currently referenced but undefined — real bug).
- `bg-card/85 backdrop-blur-lg`, top border 1px `--border`.
- 4 tabs: **Today, Log (diary), Trends, Profile** + center raised FAB. Each tab = 24px lucide icon + 11px label; tap target ≥ **48×48px**. Active: icon+label `--primary`, 4px dot under label. Inactive: `--muted-foreground`. No badge counts in v1.

### 5.2 FAB / Log Button
- **56px** circle, `bg-primary`, white `Plus` icon 26px, `--shadow-raised`, raised **-20px** above nav bar center.
- Press: `scale(0.92)` 120ms; opens bottom sheet (radius 24px top) with 5 rows @ 56px height: **Scan food (camera), Describe it (text/voice), Scan barcode, Search foods, Log exercise** — each row: 40px icon tile in its soft color (`--primary-soft` tile, `--primary` icon etc.), 15px label, chevron. Sheet also shows a "Recent" strip of 3 one-tap relog chips at top (taps-to-logged is a KPI; relog = 2 taps).

### 5.3 Hero Calorie Ring (one shared `<ProgressRing>` — the 3 copy-pasted SVGs are deleted)
- Card: full-width, padding 20px, radius 20px. Ring: **176px** outer diameter, stroke **14px**, `strokeLinecap="round"`, track `--calories-track`, fill `--foreground` (neutral ink — calories have no hue). Compute circumference from the actual `r` (fixes the current dashoffset bug).
- Center: `display-xl` 64px numeral (calories left) + `caption` "kcal left". Over target: numeral stays ink, ring fill switches to `--warning` at 100%+ and center caption becomes "kcal over" — **never red, never a warning icon**. Under-by-a-lot states get no judgment either.
- Below ring, inside the same card: 3 macro mini-bars (protein/carbs/fat), each: 11px uppercase label in its identity hue, 6px-tall rounded-full bar (soft tint track, identity-hue fill), `Space Grotesk 500 13px` value "86 / 140g".
- Card supports **horizontal swipe to page 2** (fiber, water, sodium, sugar as 4 compact tiles) with 2 page-dots (6px, `--border-strong` / `--primary`). Cal AI pattern, verbatim.

### 5.4 Macro Cards (Trends surfaces / detail rows)
Standalone 2×2 macro grid is retired from Today (merged into hero card). Where macro cards persist (Trends): 20px-radius card, 16px padding; 32px icon tile (`rounded-[12px]`, soft tint bg, lucide icon in identity hue — `Beef`/`Wheat`/`Droplets`/`Leaf`); `display-md` 28px value; 12px caption target line; 6px progress bar. Goal met = small `--success` check chip, bar stays identity-colored.

### 5.5 Food Log List Item
- Height ~**76px**, card radius 20px, list gap 8px. Layout: **56×56px** photo thumbnail (radius 12px, `object-cover`, fallback = soft-tint tile with `Utensils` icon — no generic stock photo); title 15px/600 max 1 line; second line = `caption` time + meal chip; right column = `Space Grotesk 600 17px` kcal, and below it 3 macro dots+values (`8P 24C 11F` in 12px, each value preceded by a 6px dot in its identity hue).
- Swipe left reveals: Edit (`--primary-soft`), Delete (`--destructive-soft`). Delete = soft-delete + **5s undo toast** (keep this pattern). Tap = detail/edit sheet. AI-scanned items show a confidence pip (8px dot: green ≥0.75, amber 0.45–0.75, gray <0.45) before the kcal value.

### 5.6 Charts (Recharts via shadcn `ui/chart.tsx` — the installed-but-unused wrapper becomes mandatory)
- **Weekly calories bar chart:** bars 20px wide, radius `[6,6,0,0]`, fill `--chart-under` for under, `--chart-on-target` within ±5% of goal, `--chart-over` (amber) for over; goal `ReferenceLine` dashed `4 4`, `--chart-goal-line`, 1px, label "Goal" 11px. No vertical gridlines; horizontal gridlines `--chart-grid` 1px, max 3. Direct value labels on today's bar only.
- **Weight trend:** raw weigh-ins as 3px dots at 35% opacity; **the line is the smoothed trend** (2px, `--primary`), goal line dashed `--chart-goal-line`. No CartesianGrid default; y-axis 12px `--muted-foreground` ticks, 3 max.
- **Macro donut:** slices use identity hues (coral/amber/violet) — matching the dashboard for the first time; labels outside slices in 12px `--text-secondary` (kill `fill="white"`).
- **Tooltip (all charts):** white card, radius 12px, `--shadow-raised`, 12px padding, `Space Grotesk 600 15px` value + 11px caption label; touch-activated with 44px hit slop.

### 5.7 Streak Chip
- Pill 32px height, `bg-streak-soft`, 1px border `hsl(var(--streak)/0.25)`; lucide `Flame` 16px in `--streak`; `Space Grotesk 600 14px` count.
- **Never hides at 0.** Zero state: gray flame + "Start a streak" (activation copy). Streak-freeze token (earned at 7 days, per retention research) renders as a tiny snowflake badge on the chip. Milestone days (7/30/100) get the flame-pulse celebration (§6).

### 5.8 Empty States
Every empty state = activation CTA; **no component may return `null` when empty.** Pattern: 96px illustration spot (single-color line illustration in `--primary` on `--primary-soft` circle), 17px/600 headline, 14px `--muted-foreground` one-liner, primary button. Canonical copy: empty day → "Nothing logged yet" / "Snap your plate — takes 3 seconds" / [Scan food]. Fully-logged day gets the celebratory variant: "All logged for today ✓" in `--success`.

### 5.9 Skeletons
Keep `SkeletonDashboard`'s layout-mirroring approach and make it the only pattern (kill literal "Loading…" text and blank pulse boxes). Skeleton blocks: `--muted` base with the **shimmer** keyframe (finally used): 1.6s linear gradient sweep at 8% white overlay. Rounded to the component's real radius. Rule: any card that fetches ships its skeleton in the same file.

---

## 6. Motion Spec

Durations & easings (Tailwind config tokens):
- `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` (default for everything entering)
- `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` (celebrations, FAB, chips)
- **Instant** 120ms: press feedback — every tappable gets `active:scale-[0.97]` (cards) or `0.92` (FAB/buttons)
- **Fast** 200ms: chips, toggles, tab underline, tooltip
- **Standard** 300ms: sheet/dialog enter, list item enter (staggered 40ms/item, max 8), page fade-through (fade out 120ms → fade in 180ms with 8px rise)
- **Expressive** 700ms: ring fill on mount (`--ease-out`, animated stroke-dashoffset) synchronized with number **count-up** (700ms, eased, tabular numerals so no jitter)
- No framer-motion dependency: CSS keyframes + a 30-line `useCountUp` hook + `transition` classes cover all of this.
- `prefers-reduced-motion: reduce` → rings/numbers render final state instantly, confetti replaced by a static badge, stagger removed. Non-negotiable.
- Pseudo-haptics: `navigator.vibrate(10)` on Android on log-success; iOS falls back to the 150ms spring scale on the confirmation card.

Celebration rules: confetti (40 pieces, colors = protein/carbs/fat/water/streak hues — **never gray again**) fires only for: first-ever log, streak milestones (7/30/100), goal-weight milestone. Never for over-goal days, never more than once per day.

---

## 7. Three Signature Moments

1. **The Scan Reveal.** Photo analysis result doesn't just render — the meal photo settles into its card (300ms), detected items cascade in (40ms stagger), each item's kcal counts up, then the total bar sweeps its macro segments in identity colors and the single clarifying-question chip ("Ghee tadka or plain?") springs in last. This is the TikTok-able moment and our activation event; it must feel like the app *understood the plate*.

2. **Closing the Day.** When remaining kcal reaches within ±5% of goal (or the user logs their last meal and taps "Done for today"), the hero ring completes with a 700ms sweep, emits a soft radial pulse in `--success-soft`, the center numeral flips to a checkmark-plus-summary ("On target · 3-day streak"), and the streak flame does a single 500ms spring pulse. Quiet, daily-ritual-scale — not confetti-scale.

3. **The Weekly Recap.** Sunday-evening generated card: full-bleed `--primary` gradient (the one place a gradient is allowed: `linear-gradient(160deg, hsl(152 55% 30%), hsl(172 55% 26%))`), `display-lg` white stat ("You logged 6 of 7 days"), one comparative insight in the user's own data, macro donut in identity hues, rendered as a shareable 4:5 image (Wrapped pattern — our organic-distribution asset).

---

**Implementation order (binding):** tokens + fonts + Tailwind config → shared `ProgressRing`/`useCountUp`/card primitive → bottom nav + FAB + safe-area fix → hero card → log item + skeleton/empty system → charts → celebrations. Delete list on day one: `App.css`, `CalorieProgress.tsx`, `WeightHistoryChart.tsx`, `ProfileMenu.tsx`, all `dark:` classes, all raw palette classes, gray confetti colors, emoji icons.