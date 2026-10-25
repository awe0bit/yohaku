export type BgmScene = 'home' | 'reading' | 'night'

export const resolveBgmScene = (pathname: string, dark: boolean): BgmScene => {
  // usePathname() usually strips the locale, but tolerate a prefix if present.
  const path = pathname.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/, '') || '/'
  if (/^\/(?:posts|notes|thinking)\/.+/.test(path)) return 'reading'
  return dark ? 'night' : 'home'
}
