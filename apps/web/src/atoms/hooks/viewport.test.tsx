import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import { jotaiStore } from '~/lib/store'

import { viewportAtom } from '../viewport'
import { useViewport } from './viewport'

const isDesktop = (v: { lg: boolean; w: number }) => v.lg && v.w !== 0

function Probe() {
  return <span>{String(useViewport(isDesktop))}</span>
}

describe('useViewport', () => {
  afterEach(() => {
    jotaiStore.set(viewportAtom, viewportAtom.init)
  })

  it('renders the unmeasured viewport on the server even after the store was measured', () => {
    jotaiStore.set(viewportAtom, {
      ...viewportAtom.init,
      sm: true,
      md: true,
      lg: true,
      xl: true,
      w: 1440,
      h: 900,
    })

    expect(renderToString(<Probe />)).toBe('<span>false</span>')
  })
})
