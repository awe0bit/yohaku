import type { CSSProperties } from 'react'

import { clsxm } from '~/lib/helper'

export const InkStroke: Component<{ style?: CSSProperties }> = ({
  className,
  style,
}) => (
  <svg
    aria-hidden
    className={clsxm('pointer-events-none text-accent', className)}
    height="8"
    preserveAspectRatio="none"
    style={style}
    viewBox="0 0 38 8"
  >
    <path
      d="M2 5.2 C 9 3.4, 17 6.2, 25 4.1 S 33 3.6, 36 3"
      fill="none"
      opacity="0.9"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2.4"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
)

export const InkTick: Component = ({ className }) => (
  <svg
    aria-hidden
    height="16"
    viewBox="0 0 5 16"
    width="5"
    className={clsxm(
      'pointer-events-none absolute left-px top-1/2 -translate-y-1/2 text-accent',
      className,
    )}
  >
    <path
      d="M2.4 1.5 C 3 6, 1.8 10, 2.6 14.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2.2"
    />
  </svg>
)

export const InkCheck: Component = ({ className }) => (
  <svg
    aria-hidden
    className={clsxm('pointer-events-none text-accent', className)}
    height="10"
    viewBox="0 0 14 10"
    width="14"
  >
    <path
      d="M1.5 5.4 C 3 6.4, 4 7.6, 5 8.6 C 7.4 5.6, 9.8 3.2, 12.6 1.4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
)
