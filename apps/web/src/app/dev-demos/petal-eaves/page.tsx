'use client'

import type { RefObject } from 'react'
import { useRef, useState, useSyncExternalStore } from 'react'

import { supportsDrawable } from '~/lib/html-in-canvas'

import { Article } from './_Article'
import { Panel } from './_Panel'
import type { EaveSettings } from './_useEaveCanvas'
import { useEaveCanvas } from './_useEaveCanvas'

const drawableCanvas = { layoutsubtree: '', content: 'drawable' }
const drawableChild = { drawable: '' }
const noop = () => () => {}

const DrawnArticle = ({ settings }: { settings: RefObject<EaveSettings> }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  useEaveCanvas({ articleRef, canvasRef, settingsRef: settings, spacerRef })
  return (
    <div className="relative overflow-clip" ref={spacerRef}>
      <canvas
        className="sticky top-0 block h-screen w-full"
        ref={canvasRef}
        {...drawableCanvas}
      >
        <article className="w-full" ref={articleRef} {...drawableChild}>
          <Article />
        </article>
      </canvas>
    </div>
  )
}

export default function PetalEavesPage() {
  const supported = useSyncExternalStore(noop, supportsDrawable, () => false)
  const [settings, setSettings] = useState<EaveSettings>({
    season: 'spring',
    wind: 12,
    density: 2.5,
    debug: false,
    clear: 0,
  })
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  return (
    <>
      {supported ? (
        <DrawnArticle settings={settingsRef} />
      ) : (
        <div className="mx-auto max-w-2xl">
          <p className="mb-6 rounded-[2px] border border-neutral-4 px-4 py-3 text-sm text-neutral-7">
            当前浏览器不支持 html-in-canvas（需 Chrome 156 +
            --enable-blink-features=CanvasDrawElement），以下为普通 DOM。
          </p>
          <Article />
        </div>
      )}
      <Panel
        settings={settings}
        onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
      />
    </>
  )
}
