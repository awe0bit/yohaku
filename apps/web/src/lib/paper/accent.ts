import type { Rgb } from './oklab'
import { accentRgb, lerp3, rgbToHex } from './season'

const ROOT_BG: Record<'light' | 'dark', Rgb> = {
  light: [254 / 255, 254 / 255, 251 / 255],
  dark: [28 / 255, 28 / 255, 30 / 255],
}

const ROOT_MIX = { light: 0.004, dark: 0.002 }

export const rootBgRgb = (accent: Rgb, dark: boolean) =>
  lerp3(
    dark ? ROOT_BG.dark : ROOT_BG.light,
    accent,
    dark ? ROOT_MIX.dark : ROOT_MIX.light,
  )

export const accentVars = (accent: Rgb, dark: boolean) => ({
  accent: rgbToHex(accent),
  rootBg: rgbToHex(rootBgRgb(accent, dark)),
})

export const accentCss = (lightAccent: Rgb, darkAccent: Rgb) => {
  const light = accentVars(lightAccent, false)
  const dark = accentVars(darkAccent, true)
  return `
:root[data-theme='light'] { --color-accent: ${light.accent}; --color-root-bg: ${light.rootBg}; }
:root[data-theme='dark'] { --color-accent: ${dark.accent}; --color-root-bg: ${dark.rootBg}; }
.rich-content[data-theme='light'] { --color-accent: ${light.accent}; }
.rich-content[data-theme='dark'] { --color-accent: ${dark.accent}; }`
}

export const seasonalAccentCss = (term: number) =>
  accentCss(accentRgb(term, false), accentRgb(term, true))

export const ACCENT_STYLE_ID = 'accent-color-style'
