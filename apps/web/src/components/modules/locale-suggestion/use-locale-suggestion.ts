'use client'

import { useAtom, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useLocale } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSwitchLocale } from '~/hooks/common/use-switch-locale'
import type { Locale } from '~/i18n/config'
import { buildNSKey } from '~/lib/ns'

import type { LocaleSuggestionCopy } from './copy'
import { localeSuggestionCopy } from './copy'
import { matchPreferredLocale } from './match-locale'

const APPEAR_DELAY_MS = 1500
const AUTO_HIDE_MS = 10_000

const dismissedAtom = atomWithStorage<Partial<Record<Locale, true>>>(
  buildNSKey('locale-suggestion-dismissed'),
  {},
)

const SNOOZE_KEY = buildNSKey('locale-suggestion-snoozed')

const isSnoozed = () => {
  try {
    return sessionStorage.getItem(SNOOZE_KEY) === '1'
  } catch {
    return false
  }
}

const markSnoozed = () => {
  try {
    sessionStorage.setItem(SNOOZE_KEY, '1')
  } catch {
    /* noop */
  }
}

export interface LocaleSuggestion {
  accept: () => void
  copy: LocaleSuggestionCopy
  dismiss: () => void
  locale: Locale
  snooze: () => void
}

export const useLocaleSuggestion = (): LocaleSuggestion | null => {
  const currentLocale = useLocale()
  const switchLocale = useSwitchLocale()
  const [dismissed, setDismissed] = useAtom(dismissedAtom)
  const [suggested, setSuggested] = useState<Locale | null>(null)

  useEffect(() => {
    if (isSnoozed()) return
    const timer = window.setTimeout(() => {
      const match = matchPreferredLocale(navigator.languages)
      setSuggested(
        match && match !== currentLocale && !dismissed[match] ? match : null,
      )
    }, APPEAR_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [currentLocale, dismissed])

  const snooze = useCallback(() => {
    markSnoozed()
    setSuggested(null)
  }, [])

  const dismiss = useCallback(() => {
    if (!suggested) return
    setDismissed((prev) => ({ ...prev, [suggested]: true }))
    setSuggested(null)
  }, [suggested, setDismissed])

  const accept = useCallback(() => {
    if (!suggested) return
    setSuggested(null)
    switchLocale(suggested)
  }, [suggested, switchLocale])

  useEffect(() => {
    if (!suggested) return
    const timer = window.setTimeout(snooze, AUTO_HIDE_MS)
    return () => window.clearTimeout(timer)
  }, [suggested, snooze])

  return useMemo(() => {
    if (!suggested) return null
    return {
      locale: suggested,
      copy: localeSuggestionCopy[suggested],
      accept,
      dismiss,
      snooze,
    }
  }, [suggested, accept, dismiss, snooze])
}

export const useMarkLocaleSuggestionDismissed = () => {
  const setDismissed = useSetAtom(dismissedAtom)
  return useCallback(
    (chosenLocale: Locale) => {
      const match = matchPreferredLocale(navigator.languages)
      if (match && match !== chosenLocale) {
        setDismissed((prev) => ({ ...prev, [match]: true }))
      }
    },
    [setDismissed],
  )
}
