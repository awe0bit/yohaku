'use client'

import { useState } from 'react'

import { FriendRoster, LostLinks } from '~/app/[locale]/friends/FriendRoster'
import { FriendsConstellation } from '~/app/[locale]/friends/FriendsConstellation'
import { clsxm } from '~/lib/helper'

import { fixtureBanned, fixtureFriends, fixtureOutdated } from './fixtures'

const SIZES = [1, 5, 18, 42]
const INTRO =
  '全部为本地 fixtures：头像是内联 SVG，链接指向 .example，不发任何外部请求。把窗口缩到 640px 以下看手机版。'

export default function FriendsConstellationDemo() {
  const [size, setSize] = useState(fixtureFriends.length)
  const [seed, setSeed] = useState(7)
  const [query, setQuery] = useState('')
  const links = fixtureFriends.slice(0, size)

  return (
    <div className="mx-auto max-w-[960px]">
      <header className="mb-6">
        <p className="font-mono text-caption-10 uppercase tracking-[1.5px] text-neutral-6">
          /dev-demos/friends-constellation
        </p>
        <h1 className="mt-2 font-serif text-title-28 font-medium text-neutral-10">
          友链星图
        </h1>
        <p className="mt-2 text-copy-13 text-neutral-7">{INTRO}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-label-12 text-neutral-7">
        <span>朋友数</span>
        {SIZES.map((n) => (
          <button
            key={n}
            type="button"
            className={clsxm(
              'rounded-md px-2 py-1 ring-1 ring-border',
              n === size
                ? 'bg-neutral-3 text-neutral-10'
                : 'hover:bg-neutral-2',
            )}
            onClick={() => setSize(n)}
          >
            {n}
          </button>
        ))}
        <button
          className="ml-auto rounded-md px-2 py-1 ring-1 ring-border hover:bg-neutral-2"
          type="button"
          onClick={() => setSeed((s) => s + 100)}
        >
          重新进入页面（seed {seed}）
        </button>
      </div>

      <FriendsConstellation
        initialSeed={seed}
        key={`${seed}-${size}`}
        links={links}
        query={query}
        onQueryChange={setQuery}
      />
      <FriendRoster
        key={`roster-${seed}-${size}`}
        links={links}
        query={query}
        seed={seed}
      />
      <LostLinks banned={fixtureBanned} outdated={fixtureOutdated} />
    </div>
  )
}
