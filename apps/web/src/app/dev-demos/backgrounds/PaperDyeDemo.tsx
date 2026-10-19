'use client'

import type { Image as ImageRecord } from '@mx-space/api-client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import {
  dyeInput,
  PAPER_DYE_SCOPE_CLASS,
} from '~/components/ui/background/paper/dye-input'
import { PaperDyeSource } from '~/components/ui/background/paper/PaperDyeSource'
import { MarkdownImageRecordProvider } from '~/providers/article/MarkdownImageRecordProvider'

const IMAGES: (ImageRecord & { alt: string; name: string })[] = [
  {
    name: 'warm',
    alt: '赭色山坡与暖色天空',
    src: '/dev-demos/paper-dye-warm.svg',
    width: 960,
    height: 640,
    accent: '#d46a36',
    type: 'image/svg+xml',
  },
  {
    name: 'cool',
    alt: '蓝色山脉与冷色天空',
    src: '/dev-demos/paper-dye-cool.svg',
    width: 960,
    height: 640,
    accent: '#356fac',
    type: 'image/svg+xml',
  },
  {
    name: 'forest',
    alt: '绿色树林与浅色雾气',
    src: '/dev-demos/paper-dye-forest.svg',
    width: 960,
    height: 960,
    accent: '#398460',
    type: 'image/svg+xml',
  },
  {
    name: 'violet',
    alt: '紫色暮光与远山',
    src: '/dev-demos/paper-dye-violet.svg',
    width: 960,
    height: 360,
    accent: '#9261a7',
    type: 'image/svg+xml',
  },
  {
    name: 'gold',
    alt: '金色沙丘与落日',
    src: '/dev-demos/paper-dye-gold.svg',
    width: 960,
    height: 1280,
    accent: '#b78b2e',
    type: 'image/svg+xml',
  },
]

const SCENES = {
  single: '单图 → 留白',
  adjacent: '暖色 → 冷色',
  gap: '暖色 → 长留白 → 冷色',
  sequence: '五图连续 · 不同比例',
  dense: '五图紧排 · 多图同屏',
}

export function PaperDyeDemo() {
  const [scene, setScene] = useState<keyof typeof SCENES>('sequence')
  const [weight, setWeight] = useState(0)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const figureRef = useRef<HTMLElement>(null)
  const visibleImages =
    scene === 'single'
      ? IMAGES.slice(0, 1)
      : scene === 'adjacent' || scene === 'gap'
        ? IMAGES.slice(0, 2)
        : IMAGES

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWeight(dyeInput.weight)
      setActiveImage(dyeInput.key)
    }, 100)
    return () => window.clearInterval(timer)
  }, [])

  const positionFigure = (position: 'center' | 'cross' | 'edge' | 'out') => {
    const rect = figureRef.current?.getBoundingClientRect()
    if (!rect) return
    if (position === 'cross') {
      const next =
        figureRef.current?.nextElementSibling?.getBoundingClientRect()
      if (!next) return
      window.scrollTo({
        top: window.scrollY + (rect.bottom + next.top - window.innerHeight) / 2,
        behavior: 'instant',
      })
      return
    }
    const top =
      position === 'center'
        ? (window.innerHeight - rect.height) / 2
        : position === 'edge'
          ? 32 - rect.height
          : -rect.height - 1
    window.scrollTo({
      top: window.scrollY + rect.top - top,
      behavior: 'instant',
    })
  }

  return (
    <MarkdownImageRecordProvider images={IMAGES}>
      <section className={`${PAPER_DYE_SCOPE_CLASS} mx-auto max-w-[34em] px-4`}>
        <PaperDyeSource />
        <h2 className="mb-3 text-2xl font-semibold">图片退染连续性</h2>
        <p className="mb-8 leading-relaxed text-neutral-8">
          缓慢滚动、快速划过，或在两张图片的交界处来回滚动。观察两侧是否跳色、闪断，以及连续换图时颜色能否跟上。
        </p>
        <div
          className="flex flex-col"
          style={{
            gap: scene === 'gap' ? '140vh' : scene === 'dense' ? 12 : '8vh',
          }}
        >
          {visibleImages.map((image, index) => (
            <figure
              data-paper-dye-figure={image.name}
              key={image.src}
              ref={index === 0 ? figureRef : undefined}
            >
              <Image
                unoptimized
                alt={image.alt}
                className="h-auto w-full rounded-lg"
                height={image.height}
                loading="eager"
                src={image.src}
                width={image.width}
                style={
                  scene === 'dense'
                    ? { height: '22vh', objectFit: 'cover' }
                    : undefined
                }
              />
              <figcaption className="mt-3 text-sm text-neutral-8">
                {index + 1}. {image.alt}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="flex h-[160vh] items-center justify-center text-neutral-8">
          留白区 · 此处没有图片参与染色
        </div>
      </section>
      <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 flex-col gap-3 rounded-xl border border-neutral-4 bg-neutral-1/95 p-4 text-sm shadow-sm">
        <label className="flex items-center justify-between gap-4">
          验证场景
          <select
            className="rounded border border-neutral-4 bg-neutral-1 px-2 py-1"
            value={scene}
            onChange={(event) =>
              setScene(event.target.value as keyof typeof SCENES)
            }
          >
            {Object.entries(SCENES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 whitespace-nowrap">
          {(['center', 'cross', 'edge', 'out'] as const).map(
            (position, index) => (
              <button
                className="rounded border border-neutral-4 px-3 py-1.5 hover:bg-neutral-3 disabled:opacity-40"
                disabled={position === 'cross' && visibleImages.length < 2}
                key={position}
                type="button"
                onClick={() => positionFigure(position)}
              >
                {['首图居中', '两图交界', '仅留 32px', '首图移出'][index]}
              </button>
            ),
          )}
        </div>
        <output aria-live="off" className="text-neutral-8">
          目标图片 {activeImage === null ? '无' : Number(activeImage) + 1} ·
          染色目标 {Math.round(weight * 100)}% · 实际颜色经过缓动
        </output>
      </div>
    </MarkdownImageRecordProvider>
  )
}
