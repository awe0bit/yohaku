import { useTheme } from 'next-themes'

import { useIsClient } from './use-is-client'

export const useIsDark = () => {
  const { theme, systemTheme } = useTheme()
  return theme === 'dark' || (theme === 'system' && systemTheme === 'dark')
}

// The server can't know the reader's theme, and a guessed value baked into
// SSR HTML overrides the correct one next-themes puts on <html> until React
// re-renders. Resolve only after mount so SSR markup inherits from <html>.
export const useHydratedColorScheme = (): 'dark' | 'light' | undefined => {
  const isDark = useIsDark()
  const isClient = useIsClient()
  if (!isClient) return undefined
  return isDark ? 'dark' : 'light'
}
