export interface SavedAnimation {
  name: string
  pseudo: string | null
  target: Element
  time: number
}

interface CssAnimationLike {
  animationName: string
  currentTime: CSSNumberish | null
  effect: {
    getComputedTiming?: () => { endTime?: CSSNumberish }
    pseudoElement?: string | null
    target?: Element | null
  } | null
  finish?: () => void
  pause: () => void
}

type ScopedAnimation = CssAnimationLike & {
  effect: NonNullable<CssAnimationLike['effect']> & { target: Element }
}

const cssAnimationsIn = (animations: readonly Animation[], scope: Node) =>
  (animations as readonly unknown[]).filter((a): a is ScopedAnimation => {
    const c = a as CssAnimationLike
    return (
      typeof c.animationName === 'string' &&
      (c.currentTime === null || typeof c.currentTime === 'number') &&
      !!c.effect?.target &&
      scope.contains(c.effect.target)
    )
  })

const pseudoOf = (a: ScopedAnimation) => a.effect.pseudoElement ?? null

const hasEnd = (a: ScopedAnimation) => {
  const end = a.effect.getComputedTiming?.().endTime
  return typeof end === 'number' && Number.isFinite(end)
}

export const recordAnimations = (
  animations: readonly Animation[],
  scope: Node,
): SavedAnimation[] =>
  cssAnimationsIn(animations, scope).map((a) => ({
    target: a.effect.target,
    pseudo: pseudoOf(a),
    name: a.animationName,
    time: Number(a.currentTime ?? 0),
  }))

export const restoreAnimations = (
  animations: readonly Animation[],
  scope: Node,
  saved: SavedAnimation[],
  pause: boolean,
) => {
  for (const a of cssAnimationsIn(animations, scope)) {
    const hit = saved.find(
      (s) =>
        s.target === a.effect.target &&
        s.pseudo === pseudoOf(a) &&
        s.name === a.animationName,
    )
    if (!hit && hasEnd(a) && a.finish) {
      a.finish()
      continue
    }
    if (hit) a.currentTime = hit.time
    if (pause) a.pause()
  }
}
