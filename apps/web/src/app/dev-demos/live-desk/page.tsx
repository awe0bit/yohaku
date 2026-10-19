'use client'

import clsx from 'clsx'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { setLiveDeskState } from '~/atoms/live-desk'
import {
  LiveDeskActivity,
  LiveDeskStripMeter,
} from '~/components/layout/header/internal/LiveDeskActivity'
import {
  liveDeskPopoverClassName,
  LiveDeskPopoverContent,
} from '~/components/layout/header/internal/LiveDeskPopover'
import { createLiveDeskPresentation } from '~/lib/live-desk/presentation'
import { disabledLiveDeskState } from '~/lib/live-desk/reducer'

import type { LiveDeskScenario } from './fixtures'
import { liveDeskScenarios } from './fixtures'

const OWNER = 'Innei'
const noAppIcons: Record<string, string> = {}

const chip = (active: boolean) =>
  clsx(
    'rounded-full px-3 py-1 text-label-12 transition-colors',
    active
      ? 'bg-neutral-9 text-neutral-1'
      : 'bg-neutral-3 text-neutral-8 hover:bg-neutral-4',
  )

export default function LiveDeskDemoPage() {
  const [activeId, setActiveId] = useState<string | null>(
    liveDeskScenarios[0].id,
  )
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const scenario = liveDeskScenarios.find((s) => s.id === activeId)
    setLiveDeskState(
      scenario ? scenario.build(Date.now()) : disabledLiveDeskState,
    )
  }, [activeId])

  useEffect(() => () => setLiveDeskState(disabledLiveDeskState), [])

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-2xl font-bold">Live Desk</h1>
      <p className="mb-8 text-sm text-neutral-7">
        上方是真实 header ticket（读全局 atom，悬停出浮层，点击开播放链接）；
        下方逐场景平铺浮层内容。fixtures 不走网络。
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {liveDeskScenarios.map((scenario) => (
          <button
            className={chip(scenario.id === activeId)}
            key={scenario.id}
            type="button"
            onClick={() => setActiveId(scenario.id)}
          >
            {scenario.label}
          </button>
        ))}
        <button
          className={chip(activeId === null)}
          type="button"
          onClick={() => setActiveId(null)}
        >
          离线
        </button>
        <span className="mx-2 h-4 w-px bg-neutral-4" />
        <button
          className={chip(false)}
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          亮 / 暗
        </button>
      </div>

      <div className="paper-hairline mb-3 flex h-[4.5rem] items-center gap-3 border-b">
        <span className="size-[30px] shrink-0 rounded-full bg-neutral-4" />
        <span className="[font-family:var(--font-logo-latin)] text-[19px] tracking-[0.02em] text-neutral-9">
          {OWNER}
        </span>
        <div className="relative ml-1 flex min-w-0 items-center">
          <LiveDeskActivity appIcons={noAppIcons} />
        </div>
      </div>
      <div className="mb-14 flex items-center gap-2 text-label-12 text-neutral-6">
        上滚纸条：
        <span className="size-[26px] rounded-full bg-neutral-4" />
        <LiveDeskStripMeter />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(21.5rem,1fr))] gap-x-8 gap-y-12">
        {liveDeskScenarios.map((scenario) => (
          <ScenarioPanel key={scenario.id} scenario={scenario} />
        ))}
      </div>
    </div>
  )
}

const ScenarioPanel = ({ scenario }: { scenario: LiveDeskScenario }) => {
  const [now] = useState(() => Date.now())
  const presentation = createLiveDeskPresentation(scenario.build(now), now)
  if (!presentation.visible) return null
  const { application, media } = presentation

  return (
    <figure className="m-0">
      <figcaption className="mb-3 font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-5">
        {scenario.label}
      </figcaption>
      <div className={liveDeskPopoverClassName}>
        <LiveDeskPopoverContent
          application={application}
          applicationIconURL={application?.iconURL ?? null}
          id={`live-desk-demo-${scenario.id}`}
          media={media}
          mediaIconURL={media?.artworkURL ?? null}
          ownerName={OWNER}
        />
      </div>
    </figure>
  )
}
