# Paper Background Spec

Full design of record: `docs/superpowers/specs/2026-10-17-paper-background-design.md`
(reference bench beside it in `assets/`). These are the rules any change here must keep.

## The page is the paper

The background is one washi sheet, not things drifting in front of it. Its
stock changes with the 24 solar terms (二十四节气) and its light follows the
reader's local clock. It stays alive through small in-place motion, as if the
sheet were still floating in the papermaking vat.

## Rejected — do not reintroduce

- Falling or flying particles of nameable things (the old Sakura / Snow /
  AutumnLeaves / Firefly … set).
- 空摺り blind-embossed patterns.
- Per-season material events (ink bleed, suminagashi, sun-bleach sweep, frost).
- Blurry bokeh light spots; softness comes from grain, not blur.
- Water ripples on click; the only click effect is 按压 (a shallow dent).
- Footer seal, ruled 版心 lines, pinned hover cards.
- Syncing other surfaces to the paper color; surfaces follow the accent.

## Layers and states

Layers: paper color + thickness + grain, 楮 fibers, 漉き込み fragments,
seasonal pressed petals/leaves (江南 phenology), 砂子 leaf flakes, top ぼかし,
小口染め fore-edge dye from article figures, footer 地ぼかし, PaperSheet contact
shadow.

| Layer | browse | read | immersive |
|---|---|---|---|
| Fibers | moving | still | 60% |
| 漉き込み | moving | 50% | hidden |
| 砂子 | glinting | no glint | hidden |
| Petals / leaves | moving | hidden | hidden |
| ぼかし | flowing | still | 50% |
| 小口染め | where figures exist | on | 60% |
| 按压 | on | on | on |

Solar-term changes transition over ~10 s, staggered across the sheet, keeping
anything shared by both terms in place. The background owns `--color-accent`.
Not rendered on phones, with reduced motion it renders statically.

Entering and leaving are layered (`paper/presence.ts`): the first frame equals
the root background, the paper color washes in, then fibers settle, 漉き込み
sink, 砂子 sprinkle and flash, and petals/leaves fall on a slow critically
damped spring (~4 s total). Exit reverses in ~1.3 s, leaves lifting away
first; the canvas unmounts after the paper has dried back.
