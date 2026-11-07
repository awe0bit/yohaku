import type { Box, Glyph } from './seasons/types'

const BLOCKS = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,pre,td,th,dd,dt'
const MAX_GLYPHS = 6000

const visibleRect = (r: DOMRect, w: number, h: number) =>
  r.width > 0 && r.bottom > 0 && r.top < h && r.right > 0 && r.left < w

export const collectGlyphs = (root: Element, w: number, h: number) => {
  const out: Glyph[] = []
  const range = document.createRange()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const blocks = new Map<Element, number>()
  const sizes = new Map<Element, number>()
  let lastTop: number | null = null
  let line = -1
  for (
    let node = walker.nextNode() as Text | null;
    node && out.length < MAX_GLYPHS;
    node = walker.nextNode() as Text | null
  ) {
    const parent = node.parentElement
    if (!parent || !node.data.trim()) continue
    range.selectNodeContents(node)
    if (!visibleRect(range.getBoundingClientRect(), w, h)) continue
    const blockEl = parent.closest(BLOCKS) ?? parent
    if (!blocks.has(blockEl)) blocks.set(blockEl, blocks.size)
    let size = sizes.get(parent)
    if (size === undefined) {
      size = Number.parseFloat(getComputedStyle(parent).fontSize)
      sizes.set(parent, size)
    }
    const text = node.data
    for (let i = 0; i < text.length && out.length < MAX_GLYPHS;) {
      const len = text.codePointAt(i)! > 0xFF_FF ? 2 : 1
      const ch = text.slice(i, i + len)
      if (/\S/.test(ch)) {
        range.setStart(node, i)
        range.setEnd(node, i + len)
        const r = range.getClientRects()[0]
        if (r && visibleRect(r, w, h)) {
          if (lastTop === null || Math.abs(r.top - lastTop) > r.height * 0.5) {
            line++
            lastTop = r.top
          }
          out.push({
            ch,
            x: r.left,
            y: r.top,
            w: r.width,
            h: r.height,
            size,
            line,
            block: blocks.get(blockEl)!,
          })
        }
      }
      i += len
    }
  }
  return out
}

export const collectBoxes = (root: Element, w: number, h: number): Box[] =>
  [...root.querySelectorAll('img, video')]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => visibleRect(r, w, h))
    .map((r) => ({ x: r.left, y: r.top, w: r.width, h: r.height }))
