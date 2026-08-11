# CalTrack: UI revamp + responsive QA sweep

## Locked design direction

From your picks — these are hard constraints, applied as design tokens in `src/index.css` / `tailwind.config.ts`, never hardcoded in components.

- **Palette: Paper & Ink** — off-white paper `#F5F3EE` background, `#E8E4DD` secondary surfaces, `#2D2D2D` body ink, `#0D0D0D` headline ink. One restrained accent kept for progress/positive states; the current green becomes a deep ink-green so it reads as a mark on paper rather than a brand splash. Dark mode inverts to near-black paper with warm off-white ink.
- **Typography: Space Grotesk (headings/numbers) + DM Sans (body)** — big numerals in Space Grotesk with tabular figures; labels in small-caps tracking. Replaces the current display font pairing.
- **Layout: single column** — one focus per screen, generous vertical rhythm, hairline rules instead of heavy cards.

## Revamp moves (visual only — no logic changes)

1. **Surface treatment**: retire the soft drop-shadow card look. `Surface` becomes a hairline-ruled paper block (1px border, no shadow, tighter radius). Section separation comes from rules and whitespace.
2. **Today hero**: the remaining-calories number becomes the page's typographic anchor (oversized Space Grotesk, tabular). Ring gets thinner and quieter; macros become three labelled hairline bars in a row beneath.
3. **Hierarchy pass**: one H1 per screen, consistent label/caption/micro scale, uppercase micro-labels for section headers (Favorites, Recents, Meals).
4. **Lists**: meal groups and log rows switch to divided rows rather than stacked cards — less visual noise, more scan speed.
5. **Sheets & buttons**: flat ink-filled primary button, ink-outline secondary, sheets get a paper grab handle and consistent 12px scale steps.
6. **Motion**: keep it minimal per existing project rule — press-scale and fades only, no decorative animation.

## Responsive / adaptive QA sweep

Every route walked at 320x568 (small phone), 390x844 (baseline), 430x932 (large phone), 768 (tablet), 1280 (desktop), each interactive step clicked:

- `/welcome`, `/auth`, onboarding quiz → plan reveal → signup
- `/` Today: week strip, hero, quick-log row, meals, insight card
- `/scan` (camera + upload + analysis theater + review sheet), `/describe`
- `/foods` (search, favorites chips, recents, portion sheet), `/exercise` (duration sheet)
- `/log` diary: day header, summary bar, meal groups, edit/undo, water, exercise
- `/meal/:id` detail, `/insights` (all charts), `/you` + goals / weight / milestones / settings

Fixes applied for: horizontal overflow, text clipping/truncation, tap targets under 44px, sheet content overflow on short screens, charts not resizing, fixed-width numerals wrapping, safe-area padding, and content that stretches badly past ~500px (max-width containers centered on tablet/desktop).

## Functional QA

Each flow exercised for: empty state, loading state, error state, offline/failed AI call, past-date logging, duplicate submits (double-tap guards), and back-navigation mid-flow. Bugs found get fixed in the same pass.

## Already done this turn

- AI upgraded to newer models: photo + text analysis on `google/gemini-3.1-pro-preview`, insights on `google/gemini-3.6-flash`.
- Manual "Create custom food" entry removed from the food library (AI describe is the fallback now).

## Note

The authenticated screens can't be reached by the QA browser right now — sign in once in the preview and the session becomes available, so the in-app flows can be walked automatically. Otherwise the sweep is limited to public routes.

## Technical details

- Tokens: rewrite `:root` / `.dark` HSL variables in `src/index.css` (background, card, border, foreground, muted, primary, accent, ring), plus `--shadow-card` reduced to none/hairline; `tailwind.config.ts` font families switched to Space Grotesk / DM Sans, fonts loaded in `index.html`.
- Component-level edits limited to `src/components/system/*`, `src/components/today/*`, `src/components/diary/*`, and page-level layout wrappers.
- No database, edge-function, or hook logic changes as part of the revamp.
