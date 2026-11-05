'use client'

import type { PropsWithChildren } from 'react'

import { defineYohakuRoot } from './element'

defineYohakuRoot()

const drawable = { drawable: '' }

export const YohakuRoot = ({ children }: PropsWithChildren) => (
  <yohaku-root className="block">
    <div data-theme id="root" {...drawable}>
      {children}
    </div>
  </yohaku-root>
)
