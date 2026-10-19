'use client'

import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'

import type { PageState } from '~/components/ui/background/paper/page-state'
import { PaperBackground } from '~/components/ui/background/paper/PaperBackground'
import { useIsDark } from '~/hooks/common/use-is-dark'
import { useTweakpane } from '~/hooks/common/use-tweakpane'
import { localHour } from '~/lib/paper/light'
import { SOLAR_TERMS } from '~/lib/paper/season'
import { solarTermForLocalDay } from '~/lib/paper/solar-term'

import { PaperDyeDemo } from './PaperDyeDemo'

const TERM_OPTIONS = Object.fromEntries(
  SOLAR_TERMS.map((name, i) => [`${i + 1} ${name}`, i]),
)

const PAGE_OPTIONS: Record<string, PageState> = {
  浏览: 'browse',
  阅读: 'read',
  沉浸: 'immersive',
}

const SAMPLE = [
  '早上推开窗，楼下那棵桂花已经过了最香的几天，空气里只剩一点甜味的尾巴。气温掉得很快，昨天还穿短袖的人，今天都把外套翻了出来。',
  '写东西和晾衣服有点像：写完先挂一挂，等风吹过几轮，再收回来看哪里起了皱。大部分文章隔一天再看都不太一样，有的变好了，有的只是变旧了。',
  '今年秋天打算少写一点，多读一点。书架上那几本买了一年还没拆封的，先从最薄的那本开始。',
]

export default function BackgroundsDevPage() {
  const isDark = useIsDark()
  const { setTheme, theme } = useTheme()
  const [term, setTerm] = useState(() => solarTermForLocalDay(new Date()))
  const [hour, setHour] = useState(() => localHour(new Date()))
  const [page, setPage] = useState<PageState>('browse')
  const paneHostRef = useRef<HTMLDivElement>(null)
  const latestRef = useRef({ term, hour, page, theme, setTheme })

  useEffect(() => {
    latestRef.current = { term, hour, page, theme, setTheme }
  })

  useTweakpane(
    paneHostRef,
    '余白の紙',
    (pane) => {
      const params = {
        term: latestRef.current.term,
        hour: latestRef.current.hour,
        page: latestRef.current.page,
        theme: latestRef.current.theme ?? 'system',
      }
      pane
        .addBinding(params, 'term', { label: '节气', options: TERM_OPTIONS })
        .on('change', (event) => setTerm(event.value))
      pane.addButton({ title: '过渡到下一个节气' }).on('click', () => {
        params.term = (latestRef.current.term + 1) % 24
        pane.refresh()
        setTerm(params.term)
      })
      pane
        .addBinding(params, 'hour', {
          label: '时刻',
          min: 0,
          max: 24,
          step: 0.25,
        })
        .on('change', (event) => setHour(event.value))
      pane
        .addBinding(params, 'page', {
          label: '页面状态',
          options: PAGE_OPTIONS,
        })
        .on('change', (event) => setPage(event.value))
      pane
        .addBinding(params, 'theme', {
          label: '主题',
          options: { light: 'light', dark: 'dark', system: 'system' },
        })
        .on('change', (event) => latestRef.current.setTheme(event.value))
    },
    [],
  )

  return (
    <>
      <PaperBackground
        dark={isDark}
        hour={hour}
        page={page}
        reduceMotion={false}
        term={term}
      />
      <article className="relative mx-auto max-w-[34em] px-4 py-[12vh] font-serif text-neutral-9">
        <h1 className="mb-8 text-3xl font-semibold">寒露以后</h1>
        {SAMPLE.map((p) => (
          <p className="mb-5 leading-[1.95]" key={p}>
            {p}
          </p>
        ))}
      </article>
      <PaperDyeDemo />
      <div className="fixed right-4 top-20 z-50 w-64" ref={paneHostRef} />
    </>
  )
}
