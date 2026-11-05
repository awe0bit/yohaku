import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { YohakuRoot } from './YohakuRoot'

describe('YohakuRoot', () => {
  it('renders a block-level host even without a shadow root', () => {
    const html = renderToString(<YohakuRoot>page</YohakuRoot>)
    expect(html).toMatch(/^<yohaku-root[^>]*class="block"/)
    expect(html).toContain(
      '<div data-theme="true" id="root" drawable="">page</div>',
    )
  })
})
