import 'server-only'

import type { FC } from 'react'

import { resolveAccentHue } from '~/lib/glow.server'

import { PageBleed } from './PageBleed'

export const PageColorGradient: FC<{
  seed?: string
  baseColor?: string
  bleed?: boolean
}> = ({ seed, baseColor, bleed = false }) => {
  if (!bleed) return null
  const { hue, hash } = resolveAccentHue({ seed, baseColor })
  return <PageBleed hue={hue} seed={(hash % 1000) / 1000} />
}
