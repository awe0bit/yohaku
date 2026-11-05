import { recordAnimations, restoreAnimations } from './freeze'

interface PaintableCanvas extends HTMLCanvasElement {
  onpaint: ((event: Event) => void) | null
}

export interface CanvasParts {
  animations: () => readonly Animation[]
  canvas: PaintableCanvas
  frame: HTMLDivElement
  slot: HTMLSlotElement
  target: Element
}

export const moveOutOfCanvas = ({
  frame,
  slot,
  canvas,
}: Pick<CanvasParts, 'canvas' | 'frame' | 'slot'>) => {
  canvas.onpaint = null
  frame.insertBefore(slot, canvas)
  frame.removeAttribute('data-drawn')
  frame.style.height = ''
}

export const moveIntoCanvas = (
  parts: CanvasParts,
  onPaint: (canvas: HTMLCanvasElement) => void,
) => {
  const { frame, slot, canvas, target, animations } = parts
  try {
    const saved = recordAnimations(animations(), target)
    frame.style.height = `${frame.offsetHeight}px`
    frame.setAttribute('data-drawn', '')
    canvas.onpaint = () => onPaint(canvas)
    canvas.append(slot)
    restoreAnimations(animations(), target, saved, true)
    return true
  } catch {
    moveOutOfCanvas(parts)
    return false
  }
}
