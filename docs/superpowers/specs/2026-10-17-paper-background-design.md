# Paper Background (余白の紙) — Design

Reference implementation (approved spike, single-file WebGL bench):
`docs/superpowers/specs/assets/2026-10-17-paper-background-bench.html`.
Every number below comes from that file; when this document and the bench
disagree, this document wins.

## Intent

Yohaku means "margin / blank space". The site's background should be the
paper the page is printed on, not things drifting in front of it. The old
seasonal backgrounds (Sakura, Snow, AutumnLeaves, Firefly, …) are all
rejected: falling nameable objects kept drifting toward "a picture". The new
background is one handmade-paper (washi) surface whose stock changes with the
24 solar terms (二十四节气) and whose light follows the reader's local clock.
It stays alive with very small motion, as if the sheet were still floating in
the papermaking vat.

## Goals

1. Replace the entire seasonal background system in
   `apps/web/src/components/ui/background/` with one paper background.
2. The background renders on every page (home, lists, posts, pages, notes),
   with layer visibility driven by the reading/focus state (see "Page states").
3. Solar term and time-of-day follow real local time, including for a tab that
   stays open for weeks; changes transition smoothly.
4. Delete dead code: the old components, their docs, and the unused
   `html.noise` paper-grain CSS.
5. The background drives the site accent (`--color-accent`, and the
   accent-mixed `--color-root-bg`), so header, footer, links and tags follow
   the season.
6. Replace `AmbientImageSides` with a 小口染め (fore-edge dye) layer inside
   the background.
7. One UI decoration tied to the paper: a washi-piece `HoverLinkCard`; plus a
   contact shadow where `PaperSheet` sits on the paper.

## Non-goals

- iOS app. Web only (`apps/web`).
- Phone / touch-sized viewports: the background canvas is not rendered
  (keep the `useIsMobile` gate). The seasonal accent still applies there.
- New UI controls for readers. The bench's panel (sliders, toggles) is a
  review tool, not a product feature.

## Anti-goals (fail even if it technically works)

- Falling / flying particles of nameable things (petals raining down, leaves
  blowing across).
- 空摺り (blind-embossed patterns): explicitly rejected.
- Per-season "material events" (ink bleed, suminagashi rings, sun-bleach
  sweep, frost growth): explicitly rejected.
- Blurry bokeh light spots. Softness comes from grain/noise, not blur.
- Water ripples on click (contradicts the paper metaphor).
- Anything recognizable behind paragraphs while reading.
- Rejected decorations: a footer seal (落款), ruled 版心 lines beside the text
  column, a permanently pinned hover card.
- Syncing other surfaces to the paper color: rejected. Surfaces follow the
  accent instead (see "Seasonal accent").

## Layers

All layers are drawn in one fullscreen WebGL1 fragment shader over CPU-built
textures, in this order (bench `FS` string):

| # | Layer | What it is |
|---|---|---|
| 1 | Paper base | Paper color for the current solar term, plus low-frequency thickness variation (`fbm(css/220)`, ±3.5%) |
| 2 | 漉き込み (suki) | Tiny embedded fragments 1–4 px (petal crumbs / green fibers / leaf crumbs; none in winter) |
| 3 | 季节花叶 (elements) | Whole petals and leaves pressed into the paper, ~1 per 40 000 css px², min spacing 90 px; desaturated 20% in light theme; partially occluded by fibers |
| 4 | 楮纤维 (fibers) | Long/short kozo fibers and bark specks, drawn ±gray around 128 |
| 5 | Light falloff | Very faint brightening around the time-of-day light source |
| 6 | 砂子 (sunago) | Sparse gold/silver leaf flakes in loose clusters; glint when oriented toward the light |
| 7 | ぼかし (bokashi) | Brushed gradient along the top edge (~24% of height), colored by time of day, streaky edge from noise |
| 8 | 小口染め (dye) | Fore-edge dye from the current figure's color, see below |
| 9 | Sheet contact shadow | Around on-screen `PaperSheet` rects: suki/elements/sunago fade out within 26 px of the edge (`avoid`); outside the edge a soft shadow `exp(-d/7)`, stronger below the sheet (×0.07 light, ×0.12 dark) |
| 10 | Grain | Per-pixel static hash noise ±1.5% |

Layer 1–7 and 10 are the paper; 8–9 are the integrations (bench `uDeco`).

The `html.noise` block in `apps/web/src/styles/theme.css` (lines 1–~96,
including its `@media print` rule) is never activated (no code adds the
`noise` class) and must be removed. It is not migrated.

### Seasonal parameters

- Paper color: four anchors (light / dark) at 春分, 夏至, 秋分, 冬至,
  smoothstep-interpolated across the 24 terms (`PAPER`, `paperColor`).
  Revised 2026-10-19 because autumn read too warm and the whole sheet too
  deep: the anchors are the midpoint between the original values and a
  "chroma ≤ 0.006, 2% below the root background" target. Chroma above 0.006
  is halved (秋分 0.013 → ~0.009) and light paper sits ~3% below the root
  background (was 4%); dark anchors only lose chroma.
- Sunago density peaks at 冬至 and is sparsest at 夏至 (`sunagoDensity`);
  gold ratio peaks at 霜降, silver near 清明 (`goldness`).
- Suki per season (`SUKI`, `sukiDensity`).
- Elements follow 江南 (Shanghai / Hangzhou) phenology (`ELEM_GROUPS`):

| Solar terms | Elements |
|---|---|
| 立春, 雨水 | 梅 (plum) |
| 惊蛰 | 桃 (peach, 桃始华) |
| 春分 | 樱 (cherry) |
| 清明 | 梨花 + a few fallen cherry petals |
| 谷雨 | 牡丹 petals + 藤 |
| 立夏 | 藤 + green maple |
| 小满 | green maple + a few early 紫阳花 |
| 芒种, 夏至 | 紫阳花 + green maple |
| 小暑, 大暑 | 荷 petals + green maple |
| 立秋, 处暑 | green maple + a few lotus petals |
| 白露 | 石蒜 (red spider lily) + green maple |
| 秋分 | 桂花 (osmanthus clusters) + a few 石蒜 |
| 寒露, 霜降 | fallen osmanthus + turning maple |
| 立冬 | turning maple + turning (green-yellow) ginkgo |
| 小雪 | red maple + ginkgo |
| 大雪 | fallen ginkgo + late red maple |
| 冬至 | fallen ginkgo + last red maple + early 蜡梅, an occasional 六花 |
| 小寒, 大寒 | 蜡梅 (wintersweet) + 六花 |

Shapes and palettes are in `ELEM_COLORS`, `ELEM_SIZE`, and the `draw*`
functions. Sizes 8–38 px.

### Light theme vs dark theme

Theme comes from `useIsDark`. Light-theme fragments and leaf are already
toned down in the bench (suki desaturated 40% at 0.36 mix; leaf colors pale;
glint ×0.6). Keep those values.

## Seasonal accent

- Each element group has one accent hue (`GROUP_ACCENT`, 16 entries in
  `ELEM_GROUPS` order). It is shaped in OKLab to constant lightness/chroma so
  every season has the same visual weight: light L 0.56 / C 0.12, dark
  L 0.74 / C 0.10 (`accentLab`).
- During a solar-term transition the accent interpolates in OKLab with the
  same global progress as the paper color.
- The background owns the runtime value of `--color-accent` (both themes) and
  recomputes `--color-root-bg` the way `lib/accent-color.ts` does today (mix of
  `#fefefb` / `rgb(28,28,30)` with the accent at 0.4% / 0.2%). The admin-
  configured accent is no longer used for these two variables.
- The accent is seasonal even when the canvas does not render (mobile,
  footer switch off, no WebGL). *Builder call:* first paint must already
  carry the seasonal accent (emit it server-side for the current term); the
  client corrects after hydration if the reader's local term differs.

## 小口染め (fore-edge dye)

Replaces `components/common/AmbientImageSides` (delete it, its constants and
the `ambient-sides` dev demo; remove its use in
`YohakuPostArticleContainer.tsx` and notes `YohakuArticleContainer.tsx`).

Kept from the old behavior: the figure nearest the viewport center supplies
the color (thumbhash → OKLab, lightness/chroma pinned, only the hue follows
the image: light L 0.62, dark L 0.46, C 0.075); the dye fades when no figure
is in view and when scrolling fast.

New look (bench `uDeco.x` block): the left and right viewport edges are dyed
like a book's fore-edge, as a thin strip only beside the current figure
(revised 2026-10-19: the old 140–300 px full-height band distracted while
reading). Depth `clamp(width*0.025, 20, 32)` px; the wicking front is ragged
(`fbm(css/16)`, ±25% of depth); vertically the dye covers the figure's
top–bottom and feathers out over ~90 px with a ragged edge (`uDyeBand`, fed
per figure by `dyeBands`); amount `wick^1.5 * (0.5 + 0.5*fiberness)` × 0.2
(light) / 0.22 (dark), so it soaks along fibers and fragments. A color change re-dyes from the edge inward over 3 s
(`uDyeMix`, new color inside a moving front, old color fading).

Timing (approved after tuning; do not shorten):
- A figure must stay the best candidate for 350 ms before the dye switches.
- Switching mid-transition starts from the currently blended color.
- Envelope follows figure presence with a 0.6 s time constant.
- Fast-scroll gate: target `1 - 0.55*smoothstep((v-1200)/2800)` (v in px/s),
  easing down with 0.7 s and back up with 1.1 s.

## UI decorations

- **Washi `HoverLinkCard`:** replace the rounded white card
  (`components/ui/link-card/HoverLinkCard.tsx`) with a paper piece: deckled
  edge (displacement filter, like the existing deckle filters), faint fiber
  texture, background `color-mix(accent 3%, sheet color)`, soft contact
  shadow instead of the large drop shadow. Hover-only, as today.
- **PaperSheet contact shadow:** layer 9. The renderer needs the on-screen
  rects of mounted `PaperSheet`s (thinking lists can have many; only the
  visible ones matter).

## Time

### Time of day (continuous)

Light source position/radius/color and the bokashi color/amount come from
`LIGHT_KEYS`, interpolated by local clock hour (dawn 05–08, day 08–16, dusk
16–19, night otherwise). In the app the hour is read from the local clock on
every frame (or at least every few seconds); the existing interpolation makes
the transition continuous. No user control.

### Solar term (midnight timer)

- Solar term is computed from the local date. Dates must be correct to the
  day for any year (the bench's fixed 2026 table is not enough). *Builder
  call:* a term starts on the reader's local calendar date of the
  astronomical instant (solar longitude crossing), consistent with the
  local-midnight timer; this needs a solar-longitude calculation, not a
  UTC+8 almanac table.
- A timer fires at the next local midnight, recomputes the term, and re-arms
  for the following midnight. Because background tabs and sleeping machines
  throttle timers, also recompute on `visibilitychange` (becoming visible)
  and on window `focus`.
- When the term changes, transition over ~10 s. It is not a whole-sheet
  crossfade; anything that exists in both terms stays exactly where it is:
  - Elements live on one stable pool of positions (fixed seed, Poisson
    spacing 90 px). Each position picks its type for the current term with
    weighted rendezvous hashing over the group's mix, so a type that
    continues keeps its positions; only positions whose family changes
    leave / arrive. Arrivals fade in. Leavers wither in place instead of
    fading (`makeWitherMask` → `tWither`, `wither` in the shader): over the
    first 45% of the local progress they dry toward 枯茶, then the leaf edge
    erodes inward (8-tap min of the old alpha, ragged radius up to ~7 px) and
    fibers eat holes through it until it is gone. Snow does not wither; it
    melts (desaturates and fades). Geometry (jitter, rotation, flip, size, alpha, color index) is
    seeded by position + family (`maple`, `ginkgo`, …), so a leaf of the same
    family turns color in place (green → turning → red maple, ginkgo →
    fallen ginkgo), and a different family appears up to ±25 px away rather
    than morphing on the same spot (`makeElems`).
  - Sunago uses one fixed max-density pool; each flake has a stable rank and
    is kept while rank < density, so density changes only add/remove flakes.
    Suki does the same within a season (seed per season).
  - The fade is staggered across the sheet: local progress is
    `smoothstep(clamp(mix*1.6 - vnoise(css/380)*0.6))` (`stagger` in the
    shader), so regions change at different moments; paper color lerps
    globally.
  - Keep the old textures until the fade ends. The bench implements
  this with a second texture set (`tFlakeB`, `tSukiB`, `tElemB`, `uMix`,
  `uGoldB`, `startTransition`/`commitTransition`); its "过渡到下一个节气" and
  "时刻快进" controls preview both transitions. Theme changes keep their
  current behavior.

## Motion

Production speed is what the bench calls **3×** (the bench's 1× is a slow
baseline). Per layer, at production speed:

| Layer | Motion |
|---|---|
| Fibers | local drift field, amplitude 4 px (`drift(css, 200, T*0.08)`) |
| Suki | 7 px (`drift(css, 260, T*0.07)`) |
| Elements | 5 px (`drift(css, 280, T*0.05)`) |
| Sunago | 10 px drift + per-flake spin; glint when facing the light |
| Bokashi | edge flows horizontally, depth breathes on a 40 s period |

Spin and bokashi phases are accumulated (`spinT`, `bokT`) so that motion can
fade to zero without a jump.

### Click: 按压 (press)

Active in all page states (browse, read, immersive); the user judged it does not hurt focus. In read/immersive the flake glint is off, so only the dent and the layer displacement show. A press makes a shallow dent (radius ~60 px):
nearby fibers/fragments/elements/flakes pull slightly inward, the dent rim
shows a faint light/dark side, nearby flakes tilt and glint, and the paper
springs back over ~1.5 s. Max 4 concurrent presses (`clickFx`, mode 1).
*Builder call:* listen on `window` `pointerdown` (passive) for the primary
button of mouse or pen only; ignore touch, and ignore targets inside
`input`, `textarea`, `select`, or `[contenteditable]`. A press under links
and at the start of a selection drag is acceptable.
The other click modes in the bench (blow, crumple, seal, ripple) are not
shipped.

## Page states

Derived from existing atoms in `apps/web/src/atoms/reading.ts`:

| State | Condition |
|---|---|
| browse | `!isInReading` |
| read | `isInReading` and not immersive (posts, pages, notes) |
| immersive | `immersiveReadingEnabled` (posts/pages with focus reading, mouse inside the markdown) |

| Layer | browse | read | immersive |
|---|---|---|---|
| Paper color (toward root background) | 100% | 50% | 30% |
| Thickness, time-of-day light | follow paper color | follow paper color | follow paper color |
| Grain | on | on | on |
| Fibers | on, moving | 70%, still | 45%, still |
| Suki | on, moving | 30%, still | hidden |
| Sunago | on, glinting, moving | 50%, no glint, still | hidden |
| Elements | on, moving | hidden | hidden |
| Bokashi | on, flowing | 60%, still | 35%, still |
| Press click | on | on | on |
| 小口染め | where figures exist | on | 60% |
| Sheet contact shadow | on | on | on |

Visibility and motion amounts ease toward their targets with a 0.2 s time
constant (~0.6 s to settle) (`PAGE`, the anim block in `frame`).

## Entrance and exit

The canvas is opaque from its first frame, and that frame is the page's root
background, so mounting is invisible. Textures build off the critical path
(yielding between them), and the timeline starts only once they are uploaded.
Each layer then arrives with its own motion, coarse to fine
(`paper/presence.ts`):

| Layer | Entrance (ms) | How it arrives | Exit (ms) |
|---|---|---|---|
| Paper color | 0–1100 | washes in top to bottom along a ragged fiber edge | 600–1300, dries bottom to top |
| Thickness · light · top ぼかし | 150–1250 | ぼかし brushes down from the top edge | 500–1100 |
| Fibers | 350–1450 | drift ~34 px as if still in the vat, then settle | 350–950 |
| 漉き込み | 700–1800 | sink ~22 px into place | 200–750 |
| 砂子 | 1000–2000 | sprinkle down ~30 px; each flake flashes once as it lands | 100–650, no flash |
| Petals / leaves | 1150–4000 | each falls ~96 px with a decaying sway on a critically damped spring (ω 3.2), staggered up to 0.9 s | 0–1250, lifted away with growing sway |
| 小口染め · sheet shadow | 1500–2500 | dye wicks in from the edges, shadow grows as the sheet settles | 0–600 |

Exit runs when the background switch turns off or the viewport becomes
mobile; the canvas unmounts only after the paper has dried back to the root
color. Reversing midway starts from the current values. Reduced motion: every
layer fades together over 400 ms, nothing moves.

## Constraints

- Mount point stays where `BackgroundTexture` is today
  (`components/layout/root/AppShell.tsx`, inside `RootPortal`), fixed,
  `pointer-events: none`, below content, hidden in print (`data-hide-print`).
- Keep the existing footer switch (`backgroundEffectEnabledAtom`,
  `FooterBackgroundSwitcher`): off removes the background entirely, as today.
- `prefers-reduced-motion: reduce`: render the paper statically (time frozen,
  no click effect). Keep the existing post-hydration mount.
- No WebGL: render nothing.
- Device pixel ratio capped at 2; frame rate capped at ~30 fps; no work while
  the tab is hidden.
- Texture memory must stay reasonable on large/4K displays. The bench builds
  four full-resolution RGBA textures at dpr; at 2560×1440 @2x that is ~60 MB
  each, which is too much. Keep total texture memory under ~64 MB.
- Repo code style: zero comments unless the "unexpected behavior" or
  "special design intent" bar is met; files ≤ 500 lines, components ≤ 300.

## Cleanup

Delete: all old background components, shaders, interaction code and tests
(`Ajisai*`, `AutumnLeaves*`, `DiamondDust*`, `Firefly*`, `Hanabi*`,
`Kazahana*`, `Kinmokusei*`, `Komorebi*`, `Minamo*`, `ParticlePhysics*`,
`Sakura*`, `Snow*`, `Ume*`, `Wisteria*`), `BACKGROUND_DESIGN_SPEC.md`,
`PARTICLE_PHYSICS_SYSTEM.md`, `SNOW_BACKGROUND_PHYSICS.md`, and the dead
`html.noise` CSS, `AmbientImageSides` and its dev demo, and the footer
gradient band. Replace `BACKGROUND_DESIGN_SPEC.md` with a short spec for
the new system (the rules in this document's Intent, Anti-goals, and Page
states). Rewrite `app/dev-demos/backgrounds/page.tsx` as a review bench for
the new background (term, hour, page state, theme).

## Left to the builder

- File split and module boundaries (shader, texture generators, solar-term
  math, timers, React component).
- How solar-term dates are computed (algorithm or lookup table), as long as
  they are correct to the day.
- How to meet the texture-memory budget (lower-res generation, packing
  layers into channels, tiling, etc.), as long as the look matches the bench
  at normal viewing.
- How to wire page state into the renderer (reading atoms directly vs a
  derived atom).
