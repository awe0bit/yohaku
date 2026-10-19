# Web Header 定稿 + 浮层纸面板 — Design

Visual source of truth: the Design canvas
https://claude.ai/artifact/6Ympp7nFrj1y8MAEMTZFxL (private to the owner).
Rows referenced below: **C′ 柱 × 墨线 · 三态**, **C′ 页顶 + B 纸条上滚**,
**导航下拉 popover**, **浮层家族 · 纸面板**, **导航下拉 v2**. Boards marked
"× 未选" or "（被替代）" are rejected; everything else in those rows is
approved. Mock numbers are in px at a 14px root; convert to rem/Tailwind
tokens when implementing. Where this document and the canvas disagree, this
document wins.

## Intent

The site background became washi paper (`2026-10-17-paper-background-design.md`).
The desktop header still speaks the old language: a frosted-glass capsule
(`bg-white/38 backdrop-blur-lg`), a white active pill with a drop shadow and
an icon, and `rounded-xl` popovers with large soft shadows. That reads as
SaaS UI floating over the paper. The header and every floating surface should
instead be **paper on paper**: printed type, ink marks, torn (deckled) edges,
contact shadows.

The header borrows from a book's running head (柱, *hashira*): quiet type on
the margin of the page, an ink stroke under the current section, and when
you scroll back up a slip of paper with the navigation on it.

## Goals

1. Replace the desktop header (`components/layout/header/`, `lg` and up) with
   the C′ design: page-top layout, cover-on-scroll-down, paper strip on
   scroll-up.
2. One active-state language: a hand-drawn accent ink stroke under the
   current nav item, in every header state.
3. One shared **paper panel** for every floating surface: `FloatPopover`,
   `FloatPanel`, the header `NavigationMenu` popup, `DropdownMenu`, `Select`,
   `MapBlock`'s popover, and `HoverLinkCard` (already paper; migrate it onto
   the shared piece).
4. Revise the five header dropdown contents (widths, Home, Timeline, More,
   Posts right column).
5. Light and dark parity.

## Non-goals

- Mobile header (`MobileHeader`, floating capsule, drawer). Unchanged.
- iOS app.
- Changing what the nav items are or where they link.
- Changing mobile sheet behavior of `FloatPopover` (`mobileAsSheet`).

## Anti-goals (fail even if it technically works)

- A full-width header background band, in any state. The user rejected it
  explicitly.
- Frosted glass / `backdrop-filter: blur` on any header or floating surface.
- White active pill with shadow, active-item icons, green "online" dots.
- Blurry bokeh or large diffuse drop shadows (`shadow-lg`+). Softness comes
  from the deckle and grain, not blur.
- A breadcrumb/title inside the scroll-up strip (rejected: "书眉标题" board).
- A page-width "running head" printed inside the article sheet (explored,
  replaced by the strip because it cannot work on pages without a sheet).

## Header

### Layout tokens (desktop)

Container: unchanged `max-w-7xl` centered, `px-8` (mock: content edges at
x=188 and x=1252 in a 1440 viewport). Height 4.5rem (63px).

### State 1 — page top

`justify-between`, two clusters, mirrored bookends (round avatar far left,
round login far right) so the two sides weigh the same:

- **Left:** owner avatar 30px → 12px gap → wordmark "Innei"
  (`--font-logo-latin`, 19px, `text-neutral-9`, letter-spacing 0.02em) →
  owner status ticket.
  - The ticket loses its bordered box here (see "Live Desk ticket
    content" below for what it shows).
  - No breadcrumb on the left (the ink stroke already marks the section).
- **Right:** nav items (14px, `font-medium`, gap 28px, inactive
  `text-neutral-7`, hover/active `text-neutral-10`) → 22px gap → 1×14px
  hairline → 22px gap → login/user avatar 28px.
- No background, no border. The page's top bokashi from the paper shader
  shows through.

### Active marker — ink stroke

- An SVG path under the active item's label, accent color, opacity 0.9,
  stroke 2.4px, round caps, slightly wavy:
  `M2 5.2 C 9 3.4, 17 6.2, 25 4.1 S 33 3.6, 36 3` in a 38×8 viewBox.
  Width = label width + ~10px (starts 5px before the label), sits ~10px
  below the label's baseline box.
- It follows the active item when the route changes, using the existing
  CSS anchor-positioning follower (replaces today's pill + icon followers).
  Keep the existing non-anchor fallback (no animation, just render under the
  active item).
- Keyboard focus on a nav item: show the same stroke at 50% opacity on the
  focused item (builder's call on exact focus treatment, but it must be
  visible).

### State 2 — scrolling down (reading)

- On pages with an article sheet (`PaperSheet`, i.e. note/post/page detail):
  the sheet scrolls **over** the header. The sheet layer must sit above the
  header layer (today the header is `z-[9]`, nav portal `z-10`; the sheet
  container needs a higher stacking level while the header clusters stay
  clickable when not covered).
- Header clusters fade as you scroll: opacity `1 → 0` over scrollY 40→150px,
  with a drift of up to −6px (mock: `translateY(-min(y,150)*0.04)`).
- Pages without a sheet (home, lists, timeline, thinking): same fade, nothing
  covers it.
- This replaces today's per-route split (`useHeaderShouldShowBg` /
  `HeaderHideBg`, where list pages keep the nav permanently visible). **All
  desktop pages use the same three states.** (Decision made during design;
  see "Calls made" below.)

### State 3 — scroll up: the paper strip

- Appears when scrollY ≥ 180 and the user scrolls up by more than 3px;
  hides when they scroll down by more than 3px or scrollY < 180. Keep
  today's 120ms debounce if it still feels right; builder's call.
- A single centered **paper strip**, never full width:
  - Top 12px, height 42px, width = content (≈452px with the current six
    items). Horizontally centered in the viewport.
  - Deckled paper: same treatment as the paper panel (below), with the
    stronger strip shadow (mock: contact shadow + displaced copy at 22%
    alpha, 1.8px blur, offset 2.5px down).
  - Contents, `justify-between`, 9px inner padding: owner avatar 26px + ink
    meter (the ticket collapses to the meter only) → 1×14 hairline → nav
    (13.5px, gap 24px, ink stroke under active) → hairline → user avatar
    24px. The meter appears only while media plays.
  - Identical on every page type (approved boards: 手记 / 文稿列表 / 首页).
- Motion: opacity 0→1 over 240ms and translateY −10px→0 over 360ms, easing
  `cubic-bezier(0.22, 1, 0.36, 1)`. No spring bounce. Reverse on hide.
- `prefers-reduced-motion`: no translate, opacity only.

### Owner avatar behaviors

Unchanged: single click → home (or live room when live), double click →
admin / login. Applies to the avatar in both the top layout and the strip.

Owner decisions (2026-10-18):

- **Shape:** keep the current squircle mask (not a circle). The mocks'
  circles are placeholders.
- **Status emoji badge (`OwnerStatus`):** keep, scaled to 12px, on both the
  30px top avatar and the 26px strip avatar. It stays the owner's only entry
  point for setting status.
- **LIVE indicator:** drop the red tag and the `animate-ping` ring; show a
  small "LIVE" in `--color-error` (蘇芳) ink type next to/below the avatar.

### Live Desk ticket content

Owner decision: **keep today's content and interaction logic, change only
the styling.**

- Content as now in `LiveDeskActivity.tsx`: media (title + artwork) when
  something plays, otherwise the app; ink meter only while media plays.
  "App icon + name" in the mocks is just one of these cases.
- Interaction as now: hover opens the popover (which becomes a paper
  panel), click follows the media's playback URL.
- Top layout: drop the bordered box (border, `bg` mix, `backdrop-filter`).
  Width logic (`live-desk-ticket-width.ts`, `TICKET_NAV_CLEARANCE`) must be
  redone for a left-cluster position next to the wordmark instead of a
  centered nav.
- Strip: avatar + ink meter while media plays; avatar alone otherwise.
- Live Desk disabled (`LegacyActivityIcon` path): unchanged.

## Paper panel (shared floating surface)

One primitive, used by every floating surface in Goal 3. Name and file
location are the builder's call (`components/ui/paper-panel/` fits the
existing layout). It is built the way `HoverLinkCard` already is:

- **Structure:** a positioned wrapper with `isolation: isolate`; an
  `aria-hidden` background layer (`absolute inset-0 -z-10`) carrying color,
  shadow and the deckle filter; content on top. The filter must never apply to the content layer (text would be
  displaced).
- **Color:** `color-mix(in oklab, var(--color-accent) 3%, <base>)` where
  `<base>` is white in light mode and `var(--surface-paper)` in dark mode.
  This is the existing `HoverLinkCard` recipe. The accent is seasonal, so
  panels follow the season. Verified non-zero in 8-bit for the autumn accent
  `#d4896a` (≈ −1/−3.5/−4 per channel light, +6/+3.5/+2.5 dark).
- **Edge:** one shared deckle filter (`feTurbulence` baseFrequency 0.06,
  3 octaves → `feDisplacementMap` scale 5). Reuse `HoverLinkCard`'s or the
  existing `#deckle-edge` from `container/Paper.tsx`; rendered once
  globally, not per instance.
- **No interior texture:** the fiber layer shipped once and was removed at
  the owner's request; panels are flat paper color inside the deckle.
- **Shadow:** `shadow-paper-contact` plus one lift layer:
  light `0 14px 28px -16px rgba(70,45,20,.22)`,
  dark `0 14px 28px -14px rgba(0,0,0,.55)`. Make it a utility next to
  `shadow-paper-contact` in `styles/layer.css`.
- **Safari:** add the panel's background class to the existing
  `.is-safari … { filter: none !important }` rule in `styles/layer.css`.
  The edge falls back to a straight rectangle; color and shadow remain.
- **No radius** on deckled panels.
- **Motion:** replace the scaleY/scaleX pop in `float-popover/animation.ts`
  with opacity 0→1 + translate 4px from the placement side, 220ms,
  `cubic-bezier(0.22,1,0.36,1)`; exit 150ms. Paper does not scale.
- Replace `popoverPanelClassNames` (`float-popover/styles.ts`) and the
  duplicated class lists in `FloatPanel.tsx` (currently has no callers; keep
  it consistent anyway), `dropdown-menu/index.tsx`,
  `select/Select.tsx`, `MapBlock.tsx` and the header `NavigationMenu.Popup`
  with the shared panel.

### Tooltip

`FloatPopover type="tooltip"` is too small for a deckle (it looks dirty).
Tooltip = flat paper slip: same color recipe, `shadow-paper-contact` only (no
lift), radius 2px, padding 5px 9px, 12px `text-neutral-8`, no deckle, no
fibers. Max width stays 25rem.

### Items inside panels

- **Hover/highlight in menus that take keyboard input** (`DropdownMenu`,
  `Select`): accent ink tick on the left edge (5×16 SVG,
  `M2.4 1.5 C 3 6, 1.8 10, 2.6 14.5`, stroke 2.2, accent) **plus** an accent
  wash background (`accent` at 7% light / 10% dark), text to
  `text-neutral-10`. No radius on the wash.
- **Hover in header nav dropdowns** (pointer-driven mega menus): ink tick
  and darker text only, no wash. Dates/counts on the hovered row switch to
  `--yohaku-accent-deep`.
- `Select` selected item: replace the check icon with a hand-drawn accent
  check (`M1.5 5.4 C 3 6.4, 4 7.6, 5 8.6 C 7.4 5.6, 9.8 3.2, 12.6 1.4`,
  14×10, stroke 2).
- `Select` trigger: no box; text + chevron over a 0.5px bottom hairline.
- Separators: 0.5px hairlines (`rgba(60,50,35,.16)` light,
  `rgba(255,255,255,.1)` dark), inset 6px from the panel edge.
- Destructive items: `--color-error`.
- Section labels inside panels: 10.5px, letter-spacing 4px (3px where space
  is tight), `text-neutral-6`, no uppercase transform on CJK.

## Header dropdowns (NavigationMenu)

### Container

- Paper panel as above.
- Two widths only: **wide 520px** (Home, Posts, Notes, Timeline) and
  **narrow 360px** (More). This keeps Base UI's size morph between items to
  mostly height changes.
- Alignment: `center` for every item. Drop Home's `align: 'start'`; with the
  nav on the right it pushes the panel past the header edge.
- Offset: in the page-top state hang 12px below the nav. When opened from
  the strip, the panel's top edge tucks **under** the strip by 8px (negative
  side offset; panel stacking below the strip) so it reads as pulled out from
  beneath it.
- Shared row patterns: left column 150px + 0.5px divider + right column;
  "dated index" rows = 44px mono date (`11.5px`, `text-neutral-6`, tabular) +
  title; footer row = top hairline + 12px links ending in "→".

### Contents

- **Home (520):** remove the owner avatar, name, status, now-using and
  now-playing (the header already shows the avatar; the Live Desk ticket
  popover owns activity). Left column labeled **此间**: three stats stacked,
  number in `--font-logo-latin` 24px + unit 11.5px (`篇文字` / `万字` /
  `日`), then a hairline and social icons. Right column **页面**: two-column
  list of pages. Stats keep `slot-text/react` (SlotText) for number changes.
  New i18n key for the `篇文字` unit (en/ja equivalents: builder's call).
- **Posts (520):** left **分类** with counts (`--font-logo-latin` 14px);
  right **{分类} · 最近**, dated index rows. The right column has a fixed
  height of 5 rows and shows 5 placeholder rows while loading, so hovering
  categories never changes the panel height. Footer: 查看全部文稿 → /
  `{count} 篇文稿`.
- **Notes (520):** left **专栏** (topic icon 16px + name); right **近期手记**
  dated index; footer 查看全部手记 → / 全部专栏 →.
- **Timeline (520):** the three sub-entries (手记 / 文稿 / 回忆) move into
  the left column **分类** as a plain list. Right **近期动态**: dated index
  rows with a trailing type label (11px, `text-neutral-5`). Drop the grey
  card rows (`bg-neutral-2/60`). Footer: 查看时光 →.
- **More (360):** table-of-contents rows: title (13.5px, `font-medium`) →
  dotted leader (1px dotted, flex) → description (12px, `text-neutral-6`).
  No icons. External links get a trailing `↗` after the title.

## Dark mode

Same structure; values from the `浮层家族 · 暗色` board are approximations:

- Panel base `var(--surface-paper)` + 3% accent.
- Text uses the auto-inverting `text-neutral-*` scale (no `dark:` overrides
  for neutrals, per DESIGN.md).
- Hairlines `rgba(255,255,255,.1)`; wash 10% accent; shadows as specified.
- The header itself has no surfaces besides the strip, which uses the panel
  recipe.
- The page background color in the dark mock is a guess; the real one comes
  from the paper shader's dark anchors.

## Constraints

- Tokens and rules in `DESIGN.md` and `@yohaku/design-system`; run its
  `check` on touched files.
- Desktop only for the header (`lg`+). The paper panel applies everywhere a
  panel renders (desktop popovers; mobile keeps sheets).
- Files ≤ 500 lines, components ≤ 300. `DropdownContents.tsx` is already
  ~700 lines: split it per section as part of this work.
- No `filter: blur` / `backdrop-filter` in any new surface.
- Motion must be critically damped (no bounce).
- Comments: none unless they explain a non-obvious constraint (project
  rule).
- Verify in a real browser; `dev-demos/` (not `dev/`, which is gitignored)
  is the place for any demo route.

## Calls made during design (owner may revisit)

- All desktop pages share the three header states; the per-route "always
  show nav" mode for list pages goes away.
- The strip carries no title/breadcrumb.
- Tooltips are flat slips, not deckled.
- Keyboard-driven menus get a wash in addition to the ink tick; nav
  dropdowns get the tick only.
- Home dropdown label **此间** and unit **篇文字** are new copy.
- Popover motion drops scale in favor of a short slide + fade.

## Left to the builder

- Component names, file layout, and how the shared deckle filter is
  mounted once.
- Exact scroll thresholds within ±20% if they feel wrong in the browser.
- Focus-visible styling details, as long as focus is clearly visible.
- en/ja copy for new keys.
