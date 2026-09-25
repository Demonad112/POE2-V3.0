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

The dark theme is a near-neutral charcoal scale, not black. An earlier warmer step (`#111014` page) read as brownish-grey, so it moved cooler and darker. Each step is far enough from the next that a card reads as raised off the page, and a well reads as cut into the card:

| Token | Dark | Use |
|---|---|---|
| `--surface` | `#0d0d10` | Page |
| `--surface-raised` | `#151519` | Cards, panels, accordions |
| `--surface-sunken` | `#09090b` | Wells and stat tiles inside a card |
| `--surface-overlay` | `#1c1b21` | Panel headers, open accordion rows |
| `--line` / `--line-strong` | `#27262c` / `#36343c` | Hairlines / hover borders |

Depth comes from three things, all defined once in `globals.css`:

- **`--lift` / `--lift-raised`.** A 1px inset top highlight plus a soft drop shadow. The highlight is what makes a card look bevelled rather than outlined on a dark surface. The `.card` class applies it with the border; use `.card` for any new container rather than restating the border and background.
- **The atmosphere layer.** `body::before`, fixed, holds a faint gold glow (7.5% alpha) behind the top of the page and a soft vignette. A second, orange glow was removed because it tinted the page brown. It's decoration only and sits behind all content. In light mode it becomes a faint warm wash.
- **Gold hairlines.** `--accent-line` (gold at 35%) marks what's active: the nav underline, an open accordion, the character hero border. `--accent-soft` (gold at 12%) is the fill for active and selected states. A solid brass fill (`--accent-dim`) with gold text failed contrast, so it's no longer used for fills.

Text contrast is checked against the new surfaces:

| Pair | Ratio |
|---|---|
| `--ink-mute` on raised / overlay | 5.3 / 4.9 |
| `--ink-dim` on raised | 8.1 |
| Gold on raised | 9.4 |

Light mode keeps muted text at 5.0 or better; its gold is darkened to `#86650e` for 5.4 on white.

`.card`, `.eyebrow`, `.font-display`, `.gold-rule` and `.text-gradient-gold` sit in `@layer components`. That way a Tailwind utility on the same element (a gold border, a text colour) still wins; unlayered, they silently overrode them.

## Typography

- **EB Garamond is for display only:** the wordmark and home hero (uppercase, lightly tracked, like a printed title page), page titles and the character's name. It never sets data, labels or body text.
- **Inter is for everything else.** It reads like Geist and is the standard partner for a Garamond. It's set with `cv11` and `ss01`, straight-sided `l` and open digits, which keep it close to Geist; numbers use `.tabular`.
- **Why not Cinzel.** An engraved all-caps face beside a geometric sans looked like two different sites. Garamond and Inter share proportions and x-height closely enough to sit side by side.
- **Geist Mono stays** for monospace.
- **Panel titles** are `text-base font-semibold`.
- **Small uppercase labels** use `.eyebrow`.

## Checklist and Atlas density

Long guide pages open one thing at a time:

- **Checklist.**
  - Phases and steps are `<details>`, and only the phase holding the next step and that step itself start open. A step's closed line still shows how many action items are done, how many warnings it has, and whether it carries a readiness gate.
  - The ids sit on the `<details>` elements, so every deep link (Jump to step, search, the phase bar) opens its target through `HashHighlight`.
  - On a 390px screen the page went from 17,476px to about 3,100px.
- **Atlas.**
  - The guide sits behind a tab bar (Path · Memory forks · Mechanics · Late game · Traps). A hash naming an item opens its tab.
  - The page went from 7,829px to about 3,300px on a phone.
- **Warnings.** Mistakes-to-avoid are a list of titles, each expanding to its reason. Red marks the panel's edge and icon; the words are ordinary ink. Whole paragraphs of red text read as an alarm and were skimmed past.

## Atlas map

`AtlasTreeMap` draws `atlas-tree.json` on a canvas (see `packages/data/PROVENANCE.md`):

| Mark | Meaning |
|---|---|
| Gold ring | Recommended by the guide |
| Red ring | Trap node |
| Green fill | Ticked on this page |
| Focus pulse | What a Map button asked for |

- Every guide entry that names real nodes (`treeNodes`) gets a Map button.
- It shares the viewport maths in `components/tree/geometry.ts` with the character tree. It has its own small painter, because the character painter's layers (ascendancy wheels, weapon sets, stat routes) don't apply to it.
- Canvas text can't read CSS variables, so the palette reads the resolved font family from the element.

## Character stat sheet

Once a character is loaded, the page leads with `CharacterHero`: name, level, class, league, then a strip of tiles:

- Life
- Energy shield
- the hit that kills
- main-skill DPS
- the four resistances with cap bars
- spirit

Every tile reads a value the analysis already has. A value the data lacks drops its tile rather than showing a zero. The verdict stays in the Assessment panel below instead of appearing twice. The import box collapses to "Load another character".

Below the hero:

- **Findings** is a plain section heading over full-width cards, not a panel wrapping cards. Nesting a card in a card squeezed it and indented every line. The rank is a small gold badge in the tag row.
- **Defence** shows one row per damage type. Each row carries the resistance as a ring gauge (armour reduction for physical), the largest hit of that type the character survives, and a thin bar against the safest type. The rows are sorted thinnest-first. Max hit and resistance used to be two stacked lists that repeated every type.
- **Gear workbench** merges "Replace first" and "Gear modifiers":
  - Items appear in replace-first order.
  - Each affix can be removed, set to another tier, or swapped for a ranked candidate. Open slots can be filled.
  - One draft covers all items. A sticky strip shows the resulting resistances, counting changed lines at the bottom of their range.
  - Candidates are ordered, never scored: first a line that closes a draft shortfall, then item rarity, then defences, then damage, then attributes, then the rest.
  - "Plan a full replacement" still opens the planner and the shopping list.
- **Passive tree** replaces the route picker with two lists, Damage and EHP: the best nearby nodes within 6 points, ranked by gain per point over the whole path.
  - **Damage** counts only "% increased … Damage" lines whose qualifiers apply to the main skill. A type-specific line is scaled by that type's share of the hit.
  - **EHP** ranks closing a resistance gap first, then life + energy shield, then armour/evasion rating. Those units are never blended.
- The "Gear & tree" panel is gone. Everything it listed is in the workbench and the tree.

Checklist steps put their source-video chips on their own row under the description, so the chips never squeeze the text column on mobile.

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
