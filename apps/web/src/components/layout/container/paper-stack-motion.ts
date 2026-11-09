export const PAPER_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const DEEPEST_BACK_POSE =
  'translateZ(-26px) translateX(16px) translateY(8px) rotate(2.4deg)'

const STACK_DELAY_MS = 40
const STACK_STAGGER_MS = 40
const STACK_DURATION_MS = 420

export function stackShiftFrames(poses: string[]): Keyframe[][] {
  return poses.map((pose, index) => [
    {
      opacity: index === 0 ? 0 : 1,
      transform: index === 0 ? DEEPEST_BACK_POSE : poses[index - 1],
    },
    { opacity: 1, transform: pose },
  ])
}

export function isLateStackArrival({
  count,
  renderedEmpty,
}: {
  count: number
  renderedEmpty: boolean
}) {
  return renderedEmpty && count > 0
}

export function playStackShift(layers: HTMLElement[]) {
  const frames = stackShiftFrames(layers.map((layer) => layer.style.transform))
  return layers.map((layer, index) => {
    const willChange = layer.style.willChange
    layer.style.willChange = 'transform, opacity'
    const animation = layer.animate(frames[index], {
      delay: STACK_DELAY_MS + index * STACK_STAGGER_MS,
      duration: STACK_DURATION_MS,
      easing: PAPER_EASING,
      fill: 'both',
    })
    void animation.finished
      .catch(() => {})
      .finally(() => (layer.style.willChange = willChange))
    return animation
  })
}
