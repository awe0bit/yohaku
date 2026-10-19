import { clsxm } from '~/lib/helper'

export const paperPanelHostClassName = 'relative isolate'

export const PaperPanelSurface: Component<{ variant?: 'panel' | 'slip' }> = ({
  className,
  variant = 'panel',
}) => (
  <span
    aria-hidden
    className={clsxm(
      'pointer-events-none absolute inset-0 -z-10',
      'paper-panel-color',
      variant === 'panel'
        ? 'paper-panel-surface'
        : 'paper-slip shadow-paper-contact',
      className,
    )}
  />
)
