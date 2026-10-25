'use client'

import type { LinkModel } from '@mx-space/api-client'
import { useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { Avatar } from '~/components/ui/avatar'
import { clsxm } from '~/lib/helper'

import { layoutStars, matchesQuery } from './constellation'
import { HeatBloom } from './HeatBloom'
import { SkyBackdrop } from './SkyBackdrop'
import { StarCard } from './StarCard'
import { StarEdges } from './StarEdges'
import { StarLabels } from './StarLabels'
import type { StarTransition } from './use-star-transition'
import {
  buildGenesisTransition,
  buildTransition,
  useStarTransition,
} from './use-star-transition'

const COMPACT_WIDTH = 640

export const FriendsConstellation = ({
  links,
  initialSeed,
  query,
  onQueryChange,
}: {
  links: LinkModel[]
  initialSeed: number
  query: string
  onQueryChange: (query: string) => void
}) => {
  const t = useTranslations('friends')
  const reduceMotion = useReducedMotion() ?? false
  const frameRef = useRef<HTMLDivElement>(null)
  const skyRef = useRef<SVGGElement>(null)
  const starElsRef = useRef(new Map<string, HTMLAnchorElement>())
  const pointerTypeRef = useRef('mouse')
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  )
  const [seed, setSeed] = useState(initialSeed)
  const [transition, setTransition] = useState<StarTransition | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [drawKey, setDrawKey] = useState(0)
  const [blooming, setBlooming] = useState(false)
  const bootedRef = useRef(false)

  useLayoutEffect(() => {
    const el = frameRef.current!
    const observer = new ResizeObserver(() =>
      setSize((prev) =>
        prev?.width === el.clientWidth && prev.height === el.clientHeight
          ? prev
          : { width: el.clientWidth, height: el.clientHeight },
      ),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const compact = !!size && size.width < COMPACT_WIDTH
  const count = compact ? 9 : 18
  const layout = useMemo(
    () => size && layoutStars(links, { ...size, count, seed, compact }),
    [links, size, count, seed, compact],
  )

  // Cold start: the first measured layout ignites from a hot cloud and cools
  // into place, then the edges are traced in by the settle handler below.
  useLayoutEffect(() => {
    if (bootedRef.current || !layout || !size) return
    bootedRef.current = true
    if (reduceMotion) return
    setBlooming(true)
    setTransition(buildGenesisTransition(layout, size, seed))
  }, [layout, size, seed, reduceMotion])

  useStarTransition({
    transition,
    layout,
    size,
    compact,
    starElsRef,
    skyRef,
    onSettle: (nextSeed) => {
      setSeed(nextSeed)
      setTransition(null)
      setDrawKey((k) => k + 1)
    },
  })

  const reshuffle = () => {
    if (!layout || !size || transition) return
    setActiveId(null)
    const nextSeed = seed + 1
    if (reduceMotion) {
      setSeed(nextSeed)
      return
    }
    const next = layoutStars(links, { ...size, count, seed: nextSeed, compact })
    setTransition(buildTransition(layout, next, nextSeed))
  }

  const settledPoints = layout?.points ?? []
  const target = new Map(
    [...settledPoints, ...(transition?.next.points ?? [])].map((p) => [
      p.link.id,
      p,
    ]),
  )
  const stars = (
    transition?.stars.map((s) => s.link) ?? settledPoints.map((p) => p.link)
  ).sort((a, b) => a.id.localeCompare(b.id))
  const active = settledPoints.find((p) => p.link.id === activeId)
  const width = size?.width ?? 0
  const height = size?.height ?? 0

  return (
    <section
      aria-label={t('map_title')}
      ref={frameRef}
      className={clsxm(
        'relative mt-8 h-[460px] overflow-hidden bg-neutral-1 ring-1 ring-border md:h-[520px] md:rounded-2xl',
        '-mx-2 md:mx-0',
      )}
      style={{
        backgroundImage:
          'radial-gradient(560px 360px at 22% 18%, color-mix(in srgb, var(--color-accent) 7%, transparent), transparent 70%)',
      }}
      onClick={(e) => e.target === e.currentTarget && setActiveId(null)}
    >
      {size && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full text-neutral-10"
          viewBox={`0 0 ${width} ${height}`}
        >
          <g ref={skyRef}>
            <SkyBackdrop compact={compact} height={height} width={width} />
          </g>
          <StarEdges
            drawKey={drawKey}
            hidden={!!transition}
            layout={layout}
            seed={seed}
          />
        </svg>
      )}

      {blooming && size && (
        <HeatBloom
          height={height}
          width={width}
          onDone={() => setBlooming(false)}
        />
      )}

      {stars.map((link) => {
        const p = target.get(link.id)!
        return (
          <a
            href={link.url}
            key={link.id}
            rel="noreferrer"
            target="_blank"
            aria-label={
              link.description ? `${link.name}: ${link.description}` : link.name
            }
            className={clsxm(
              'absolute left-0 top-0 z-10 flex rounded-full bg-paper ring-1 ring-black/15 will-change-transform dark:ring-white/20',
              'transition-[scale,box-shadow,filter] duration-200 hover:scale-[1.18]',
              activeId === link.id &&
                'scale-[1.18] shadow-[0_0_0_7px_color-mix(in_srgb,var(--color-accent)_12%,transparent)] ring-[1.5px] ring-accent',
              !matchesQuery(link, query) && 'opacity-20',
              transition && 'pointer-events-none',
            )}
            ref={(el) => {
              if (el) starElsRef.current.set(link.id, el)
              else starElsRef.current.delete(link.id)
            }}
            style={{
              // The element is the avatar box (flex below), so `-50%` centres
              // it exactly on the layout point.
              translate: `calc(${p.x}px - 50%) calc(${p.y}px - 50%)`,
            }}
            onBlur={() => setActiveId(null)}
            onFocus={() => setActiveId(link.id)}
            onMouseEnter={() => setActiveId(link.id)}
            onMouseLeave={() => setActiveId(null)}
            onPointerDown={(e) => (pointerTypeRef.current = e.pointerType)}
            onClick={(e) => {
              if (pointerTypeRef.current === 'mouse' || activeId === link.id)
                return
              e.preventDefault()
              setActiveId(link.id)
            }}
          >
            <Avatar
              randomColor
              alt=""
              lazy={false}
              size={compact ? 36 : 40}
              src={link.avatar}
              text={link.name}
            />
          </a>
        )
      })}

      {!transition && (
        <StarLabels
          compact={compact}
          points={settledPoints}
          query={query}
          seed={seed}
          staggered={drawKey > 0}
          width={width}
        />
      )}

      <StarCard
        docked={compact}
        link={active?.link ?? null}
        style={
          active && {
            left:
              active.x + 294 > width - 16
                ? active.x - 294
                : Math.min(Math.max(active.x + 34, 16), width - 276),
            top: Math.min(Math.max(active.y - 40, 60), height - 190),
          }
        }
      />

      <div className="absolute inset-x-4 top-4 z-30 flex items-center justify-between gap-4 md:inset-x-5">
        <div className="hidden font-mono text-caption-10 uppercase tracking-[1.5px] text-neutral-6 md:block">
          {t('map_title')}
        </div>
        <label className="flex h-8 w-full items-center gap-2 rounded-lg bg-paper/70 px-2.5 text-neutral-6 ring-1 ring-border backdrop-blur-md focus-within:ring-accent/45 md:w-[220px]">
          <i className="i-mingcute-search-line text-icon-sm" />
          <input
            aria-label={t('map_search_placeholder')}
            className="min-w-0 flex-1 bg-transparent text-copy-13 text-neutral-9 outline-none placeholder:text-neutral-6"
            placeholder={t('map_search_placeholder')}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </label>
      </div>

      <div className="absolute inset-x-4 bottom-3.5 z-30 flex justify-between text-label-12 text-neutral-6 md:inset-x-5">
        <span>{compact ? t('map_hint_tap') : t('map_hint_hover')}</span>
        <button
          className="text-neutral-7 transition-colors hover:text-neutral-10 disabled:text-neutral-6"
          disabled={!!transition}
          type="button"
          onClick={reshuffle}
        >
          {t('map_reshuffle')} ↻
        </button>
      </div>
    </section>
  )
}
