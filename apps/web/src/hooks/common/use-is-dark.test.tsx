import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { useHydratedColorScheme } from './use-is-dark'

function Probe() {
  return <span>{String(useHydratedColorScheme())}</span>
}

describe('useHydratedColorScheme', () => {
  it('stays unresolved during server render so the page theme is inherited', () => {
    expect(renderToString(<Probe />)).toBe('<span>undefined</span>')
  })
})
