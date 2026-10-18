import { ACCENT_STYLE_ID, seasonalAccentCss } from '~/lib/paper/accent'
import { accentRgb, rgbToHex } from '~/lib/paper/season'
import { solarTermForLocalDay } from '~/lib/paper/solar-term'

export function AccentColorStyleInjector() {
  const term = solarTermForLocalDay(new Date())
  return (
    <style
      dangerouslySetInnerHTML={{ __html: seasonalAccentCss(term) }}
      data-dark={rgbToHex(accentRgb(term, true))}
      data-light={rgbToHex(accentRgb(term, false))}
      data-term={term}
      id={ACCENT_STYLE_ID}
    />
  )
}
