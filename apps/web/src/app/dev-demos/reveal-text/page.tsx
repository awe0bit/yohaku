'use client'

import { useEffect, useState } from 'react'

import { RevealText } from '~/components/ui/reveal-text'

const TITLES = [
  '在数字世界里，保留一张纸的温度',
  '把日子过成清澈的日常',
  '清晨',
  '当所有的钟声都停在那一秒',
  '在所有信号都安静下来的深夜里，我重新读了一遍十年前写给自己的信，才发现那些没说完的话一直在等一个合适的傍晚',
]

const btn =
  'rounded-lg bg-neutral-3 px-4 py-2 text-sm text-neutral-9 hover:bg-neutral-4'

export default function RevealTextDemoPage() {
  const [index, setIndex] = useState(0)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => setIndex((i) => (i + 1) % TITLES.length), 2400)
    return () => clearInterval(id)
  }, [auto])

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">RevealText</h1>
      <p className="mb-8 text-sm text-neutral-7">
        页脚「实时阅读」标题的切换：新标题从首字向右擦出（520ms），旧行 260ms
        淡出。下面按页脚实际字号（12px / 行高 1.5 / 30rem 截断）播放。
      </p>

      <div className="rounded-xl border border-neutral-3 bg-neutral-1 p-6">
        <div className="flex items-start justify-between gap-8">
          <div className="text-[10px] leading-relaxed text-neutral-5">
            © 2026 Innei
            <br />
            Mix Space · 余白
          </div>
          <div className="flex min-w-0 flex-col items-end gap-1 text-label-12 text-neutral-6">
            <p className="flex items-baseline gap-1.5 whitespace-nowrap">
              <i className="size-[5px] self-center rounded-full bg-accent" />
              <span className="text-neutral-8 tabular-nums">3</span>
              <span>人此刻在读</span>
            </p>
            <div className="max-w-[30rem]">
              <RevealText text={TITLES[index]} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <button
          className={btn}
          onClick={() => setIndex((i) => (i + 1) % TITLES.length)}
        >
          下一条
        </button>
        <button className={btn} onClick={() => setAuto((a) => !a)}>
          {auto ? '暂停自动' : '恢复自动'}
        </button>
        <span className="text-sm text-neutral-6">
          {index + 1} / {TITLES.length}
        </span>
      </div>
    </div>
  )
}
