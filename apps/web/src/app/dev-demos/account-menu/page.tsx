'use client'

import type {
  AggregateRoot,
  MembershipPlansResult,
  MembershipStatusResult,
} from '@mx-space/api-client'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { setIsOwnerLogged } from '~/atoms/hooks/owner'
import { setSessionReader } from '~/atoms/hooks/reader'
import { UserAuth } from '~/components/layout/header/internal/UserAuth'
import {
  membershipPlansQueryKey,
  membershipStatusQueryKey,
} from '~/components/modules/membership/useMembership'
import { jotaiStore } from '~/lib/store'
import type { SessionReader } from '~/models/session'
import { aggregationDataAtom } from '~/providers/root/aggregation-data-provider'

const avatar = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#9fb8d6"/><circle cx="32" cy="26" r="12" fill="#f3ead8"/><rect x="14" y="42" width="36" height="22" rx="11" fill="#f3ead8"/></svg>',
)}`

const reader: SessionReader = {
  email: 'reader@example.com',
  emailVerified: null,
  handle: 'Innei',
  id: 'demo-reader',
  image: avatar,
  isOwner: false,
  name: 'Innei',
  provider: 'github',
  providerAccountId: 'demo',
  scope: '',
  tokenType: '',
  type: 'oauth',
}

const sponsorStatus = {
  currentPeriodEnd: '2030-01-31T00:00:00.000Z',
  status: 'active',
} as unknown as MembershipStatusResult

const inactiveStatus = { status: 'none' } as unknown as MembershipStatusResult

const plans = { enabled: true } as unknown as MembershipPlansResult

const ownerAggregate = {
  user: { avatar, name: 'Innei', username: 'innei' },
} as unknown as AggregateRoot

interface Persona {
  id: string
  label: string
  owner: boolean
  session: SessionReader | null
  status: MembershipStatusResult | null
}

const personas: Persona[] = [
  {
    id: 'sponsor',
    label: '读者 · 赞助中',
    owner: false,
    session: reader,
    status: sponsorStatus,
  },
  {
    id: 'reader',
    label: '读者 · 未赞助',
    owner: false,
    session: reader,
    status: inactiveStatus,
  },
  { id: 'owner', label: '站长', owner: true, session: null, status: null },
  {
    id: 'owner-session',
    label: '站长 + 读者会话',
    owner: true,
    session: reader,
    status: sponsorStatus,
  },
]

const chip = (active: boolean) =>
  clsx(
    'rounded-full px-3 py-1 text-label-12 transition-colors',
    active
      ? 'bg-neutral-9 text-neutral-1'
      : 'bg-neutral-3 text-neutral-8 hover:bg-neutral-4',
  )

export default function AccountMenuDemoPage() {
  const [personaId, setPersonaId] = useState(personas[0].id)
  const queryClient = useQueryClient()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const persona = personas.find((p) => p.id === personaId)!
    jotaiStore.set(aggregationDataAtom, ownerAggregate)
    queryClient.setQueryData(membershipPlansQueryKey, plans)
    if (persona.status) {
      queryClient.setQueryData(membershipStatusQueryKey, persona.status)
    } else {
      queryClient.removeQueries({ queryKey: membershipStatusQueryKey })
    }
    setIsOwnerLogged(persona.owner)
    setSessionReader(persona.session)
  }, [personaId, queryClient])

  useEffect(
    () => () => {
      setIsOwnerLogged(false)
      setSessionReader(null)
      jotaiStore.set(aggregationDataAtom, null)
    },
    [],
  )

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold">Account menu</h1>
      <p className="mb-8 text-sm text-neutral-7">
        真实 header 用户菜单（悬停头像展开）。切换身份看不同组合；会员状态写入
        query cache，不走网络。
      </p>

      <div className="mb-10 flex flex-wrap items-center gap-2">
        {personas.map((persona) => (
          <button
            className={chip(persona.id === personaId)}
            key={persona.id}
            type="button"
            onClick={() => setPersonaId(persona.id)}
          >
            {persona.label}
          </button>
        ))}
        <span className="mx-2 h-4 w-px bg-neutral-4" />
        <button
          className={chip(false)}
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          亮 / 暗
        </button>
      </div>

      <div className="paper-hairline flex h-[4.5rem] items-center justify-end gap-[22px] border-b pr-2">
        <span className="text-copy-14 text-neutral-7">Timeline</span>
        <span className="text-copy-14 text-neutral-7">More</span>
        <div className="paper-hairline flex h-7 items-center border-l pl-[22px]">
          <UserAuth />
        </div>
      </div>
    </div>
  )
}
