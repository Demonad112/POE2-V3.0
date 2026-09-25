# Visual design notes

Dark-first, information-dense, and deliberately restrained: the goal is a page
that is *informative without being overbearing*. Density comes from ranking and
hierarchy, not from showing everything at once.

## Hierarchy

The page answers three questions in order:

1. **What will kill me?** — a single hero number, `lowestMaximumHitTaken`, in the
   danger colour, with the EHP overstatement stated beneath it.
2. **What should I do about it?** — ranked findings, each with impact, cost and
   trade-off visible without interaction; evidence one click away.
3. **What are the details?** — defence stats, gear, the DPS matrix,
   cross-validation.

Evidence trails, buff skills, and the full cross-validation list are all
collapsed by default. Everything is available; nothing shouts.

## Surfaces and depth

The dark theme is a warm charcoal scale, not black. Each step is far enough from the next that a card reads as raised off the page, and a well reads as cut into the card:

| Token | Dark | Use |
|---|---|---|
| `--surface` | `#111014` | Page |
| `--surface-raised` | `#1a181e` | Cards, panels, accordions |
| `--surface-sunken` | `#0c0b0e` | Wells and stat tiles inside a card |
| `--surface-overlay` | `#221f27` | Panel headers, open accordion rows |
| `--line` / `--line-strong` | `#2f2a33` / `#3f3845` | Hairlines / hover borders |

Depth comes from three things, all defined once in `globals.css`:

- **`--lift` / `--lift-raised`.** A 1px inset top highlight plus a soft drop shadow. The highlight is what makes a card look bevelled rather than outlined on a dark surface. The `.card` class applies it with the border; use `.card` for any new container rather than restating the border and background.
- **The atmosphere layer.** `body::before`, fixed, holds a faint gold glow behind the top of the page and a soft vignette. It's decoration only and sits behind all content. In light mode it becomes a faint warm wash.
- **Gold hairlines.** `--accent-line` (gold at 35%) marks what's active: the nav underline, an open accordion, the character hero border. `--accent-soft` (gold at 12%) is the fill for active and selected states. A solid brass fill (`--accent-dim`) with gold text failed contrast, so it's no longer used for fills.

Text contrast is checked against the new surfaces:

| Pair | Ratio |
|---|---|
| `--ink-mute` on raised / overlay | 5.1 / 4.7 |
| `--ink-dim` on raised | 7.8 |
| Gold on raised | 9.0 |

Light mode keeps muted text at 5.0 or better; its gold is darkened to `#86650e` for 5.4 on white.

`.card`, `.eyebrow`, `.font-display`, `.gold-rule` and `.text-gradient-gold` sit in `@layer components`. That way a Tailwind utility on the same element (a gold border, a text colour) still wins; unlayered, they silently overrode them.

## Typography

- **Cinzel is for display only:** the wordmark, page titles, the home hero and the character's name. It never sets data, labels or body text; engraved capitals don't read at small sizes, and numbers need Geist's tabular figures.
- **Geist is for everything else.** Panel titles are `text-base font-semibold`, so they outrank body text.
- **Small uppercase labels use `.eyebrow`** (11px, 0.08em tracking). This replaces the ad-hoc `tracking-wide uppercase` combinations, which rendered with uneven gaps.

## Character stat sheet

Once a character is loaded, the page leads with `CharacterHero`: name, level, class, league, then a strip of tiles:

- Life
- Energy shield
- the hit that kills
- main-skill DPS
- the four resistances with cap bars
- spirit

Every tile reads a value the analysis already has. A value the data lacks drops its tile rather than showing a zero. The verdict stays in the Assessment panel below instead of appearing twice. The import box collapses to "Load another character".

## Colour

The damage-type palette is **validated, not chosen by eye**. It was run through
the `dataviz` skill's six-check validator against both surfaces:

| Type | Light | Dark |
|---|---|---|
| Physical | `#1baf7a` | `#199e70` |
| Fire | `#eb6834` | `#d95926` |
| Cold | `#2a78d6` | `#3987e5` |
| Lightning | `#eda100` | `#c98500` |
| Chaos | `#4a3aa7` | `#9085e9` |

```
$ node scripts/validate_palette.js "#199e70,#d95926,#3987e5,#c98500,#9085e9" --mode dark
  [PASS] Lightness band · Chroma floor · CVD separation (worst adjacent ΔE 9.4)
  [PASS] Normal-vision floor (ΔE 26.5) · Contrast vs surface
  → ALL CHECKS PASS
```

Two consequences to preserve if these are ever changed:

- **Physical is aqua, not grey.** Every neutral candidate failed the chroma floor
  — a near-grey series colour reads as gridline, not data. Semantics lost to
  legibility here, and the legend plus direct labels carry identity anyway.
- **Light mode has a contrast WARN** on the aqua and yellow steps. The validator
  permits this only with *relief*: every damage-split segment at or above 12%
  carries an inline percentage label, and every bar is directly labelled. Do not
  remove those labels.

Fire and lightning are never adjacent in a stacked bar — the fixed damage-type
order puts cold between them, which is the pair the validator flags under
all-pairs comparison.

## Absent is not zero

The assessment panel scores defence and damage out of 0.5 each. When damage
cannot be graded — no ladder sample — the bar is drawn as a **hatched track**,
not as an empty one, and the reason sits under it in words. An empty bar and a
zero bar are the same picture, and one of them accuses the build of something.

The headline follows the same rule. With only one half measured there is no
single letter to show, so it renders a **range** — `D–B`, `0.15–0.65` — and
takes its colour from the **worst** end, because a build that might be a D must
not be painted in the colour reserved for an A. Filling the gap instead by
scaling the measured half up read as a confident single letter, and at the top
of the scale it was the flattering one: perfect defences with no sample graded
A, where the same build with a sample graded B.

The same rule governs the rest of the page: a stat whose attribution disagrees
with the character sheet is listed under "not attributed" with the disagreement
quoted, rather than omitted; a finding a keystone ruled out is struck through
with the keystone named, rather than dropped. A reader cannot tell the
difference between "nothing found" and "found and withdrawn" unless the page
says which.

## Marks

- Damage-split segments are separated by a 2px surface gap, with 4px rounded
  ends on the data end of every bar.
- Grid, axes and rules are recessive; text uses ink tokens, never a series
  colour, so identity always rests on a mark beside the text.
- Max-hit bars are sorted thinnest-first, so the killing vector is read first.

## Theme

Dark by default. The toggle sits in the nav bar, after Search; it used to float at a fixed position, where it overlapped Search. The viewer's toggle stamps `data-theme` on the root and wins
over the OS preference in both directions; a bootstrap script applies the stored
choice before paint so a light preference never flashes dark.

## Responsiveness

Panels are single-column below `lg`. Wide content — the DPS matrix — scrolls
inside its own `overflow-x-auto` container; **the page body never scrolls
horizontally**, and `scripts/screenshot.mjs` asserts this at 390px.

Every panel carries `min-w-0`. Without it a grid child defaults to
`min-width: auto`, refuses to shrink below its content, and pushes the whole page
into horizontal scroll — which is exactly the bug the screenshot check caught.

## Loading

Analysis takes a moment: a 388 KB payload plus a zlib inflate for the PoB
cross-check. The skeleton mirrors the final layout so nothing jumps when real
content lands, and it respects `prefers-reduced-motion`.
