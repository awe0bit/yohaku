const FADE_MS = 600

export interface FloatHost {
  children: Iterable<HTMLElement>
  observe: (cb: (added: HTMLElement[]) => void) => () => void
}

interface Saved {
  el: HTMLElement
  opacity: string
  pointerEvents: string
  transition: string
}

export const bodyHost = (doc: Document = document): FloatHost => ({
  children: [...doc.body.children] as HTMLElement[],
  observe: (cb) => {
    const mo = new MutationObserver((records) =>
      cb(
        records.flatMap((r) =>
          [...r.addedNodes].filter(
            (n): n is HTMLElement => n.nodeType === Node.ELEMENT_NODE,
          ),
        ),
      ),
    )
    mo.observe(doc.body, { childList: true })
    return () => mo.disconnect()
  },
})

export const fadeFloating = (
  host: FloatHost,
  keep: (el: HTMLElement) => boolean,
) => {
  const saved: Saved[] = []
  const fade = (el: HTMLElement) => {
    if (keep(el) || saved.some((s) => s.el === el)) return
    const { opacity, pointerEvents, transition } = el.style
    saved.push({ el, opacity, pointerEvents, transition })
    el.style.transition = [transition, `opacity ${FADE_MS}ms ease`]
      .filter(Boolean)
      .join(', ')
    el.style.opacity = '0'
    el.style.pointerEvents = 'none'
  }
  for (const el of host.children) fade(el)
  const stop = host.observe((added) => added.forEach(fade))
  return {
    restore: () => {
      stop()
      for (const s of saved) {
        s.el.style.opacity = s.opacity
        s.el.style.pointerEvents = s.pointerEvents
      }
      setTimeout(() => {
        for (const s of saved) s.el.style.transition = s.transition
      }, FADE_MS)
    },
  }
}
