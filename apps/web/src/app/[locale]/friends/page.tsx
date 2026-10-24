'use client'

import type { LinkModel } from '@mx-space/api-client'
import { LinkState, LinkType } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'

import { MotionButtonBase } from '~/components/ui/button'
import { FullPageLoading } from '~/components/ui/loading'
import { BottomToUpSoftSpringTransitionView } from '~/components/ui/transition'
import { apiClient } from '~/lib/request'
import { springScrollToTop } from '~/lib/scroller'

import { ApplyLinkInfo } from './ApplyLinkInfo'
import { CollectionLinks, FriendRoster, LostLinks } from './FriendRoster'
import { FriendsConstellation } from './FriendsConstellation'

export default function Page() {
  const t = useTranslations('friends')
  const tCommon = useTranslations('common')
  const [visitSeed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const [query, setQuery] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      return await apiClient.link.getAll()
    },
    select: useCallback((data: LinkModel[]) => {
      const friends: LinkModel[] = []
      const collections: LinkModel[] = []
      const outdated: LinkModel[] = []
      const banned: LinkModel[] = []

      for (const link of data) {
        if (link.hide) {
          continue
        }

        switch (link.state) {
          case LinkState.Banned: {
            banned.push(link)
            continue
          }
          case LinkState.Outdate: {
            outdated.push(link)
            continue
          }
        }

        switch (link.type) {
          case LinkType.Friend: {
            friends.push(link)
            break
          }
          case LinkType.Collection: {
            collections.push(link)
          }
        }
      }

      return { friends, collections, outdated, banned }
    }, []),
  })

  if (isLoading) return <FullPageLoading />
  if (!data) return null
  const { banned, collections, friends, outdated } = data
  return (
    <div>
      <BottomToUpSoftSpringTransitionView lcpOptimization delay={0}>
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-caption-10 uppercase tracking-[1.5px] text-neutral-6">
              {t('eyebrow')}
            </div>
            <h1 className="mt-2.5 font-serif text-title-28 font-medium text-neutral-10 md:text-display-36">
              {t('page_title')}
            </h1>
            <p className="mt-2 font-serif text-copy-15 tracking-[0.08em] text-neutral-7 md:text-copy-16">
              {t('page_subtitle')}
            </p>
          </div>
          {friends.length > 0 && (
            <div className="flex items-baseline gap-2 md:block md:text-right">
              <div className="font-serif text-title-24 font-medium text-neutral-10 md:text-display-36">
                {friends.length}
                <span className="ml-1 text-copy-14 font-normal text-neutral-7">
                  {t('tally_unit')}
                </span>
              </div>
              <div className="text-label-12 text-neutral-7">
                {t('tally_hint')}
              </div>
            </div>
          )}
        </header>
      </BottomToUpSoftSpringTransitionView>

      {friends.length > 0 && (
        <>
          <FriendsConstellation
            initialSeed={visitSeed}
            links={friends}
            query={query}
            onQueryChange={setQuery}
          />
          <FriendRoster links={friends} query={query} seed={visitSeed} />
        </>
      )}
      <LostLinks banned={banned} outdated={outdated} />
      <CollectionLinks links={collections} />

      <ApplyLinkInfo />
      <div className="mt-10 flex justify-center border-t border-black/[0.06] pt-6 dark:border-white/[0.06]">
        <MotionButtonBase
          className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-copy-13 text-neutral-10/55 transition-colors duration-200 hover:bg-black/[0.02] hover:text-neutral-10/85 dark:hover:bg-white/4"
          onClick={springScrollToTop}
        >
          <i className="i-mingcute-arrow-up-circle-line text-copy-14 opacity-70" />
          <span>{tCommon('back_to_top')}</span>
        </MotionButtonBase>
      </div>
    </div>
  )
}
