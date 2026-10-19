'use client'

import './nav-menu.css'

import type { BaseUIEvent } from '@base-ui/react'
import { NavigationMenu } from '@base-ui/react/navigation-menu'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import {
  useCallback,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

import {
  InkStroke,
  paperPanelHostClassName,
  PaperPanelSurface,
} from '~/components/ui/paper-panel'
import { Link, usePathname } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'

import type { IHeaderMenu } from '../config'
import { dropdownTypeMap } from './dropdown'
import {
  useHeaderConfig,
  useHeaderConfigValue,
} from './HeaderDataConfigureProvider'

export type HeaderNavVariant = 'top' | 'strip'

const useNavDebugMode = () => {
  const [debug] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      new URLSearchParams(window.location.search).get('nav_debug') === '1' ||
      !!localStorage.getItem('nav_debug')
    )
  })
  return debug
}

const subscribeNoop = () => () => {}

function cssAnchorPositioningSupported() {
  if (typeof CSS === 'undefined') return false
  // Some engines report position-anchor before anchor() resolves correctly
  return (
    CSS.supports?.('position-anchor', 'auto') === true &&
    CSS.supports?.('left', 'anchor(left)') === true
  )
}

const isPathActive = (pathname: string, path: string) =>
  path === pathname ||
  pathname.slice(1) === path ||
  pathname.startsWith(`${path}/`)

const resolveSectionState = (pathname: string, section: IHeaderMenu) => {
  const subIndex =
    section.subMenu?.findIndex((item) => isPathActive(pathname, item.path)) ??
    -1
  const isActive =
    pathname === section.path ||
    (pathname.startsWith(`${section.path}/`) &&
      !section.exclude?.includes(pathname)) ||
    subIndex > -1
  return { isActive, activeSubItem: section.subMenu?.[subIndex] }
}

const STROKE_TRANSITION =
  'left 0.45s cubic-bezier(0.22, 1, 0.36, 1), width 0.45s cubic-bezier(0.22, 1, 0.36, 1), top 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease'

export const HeaderNav: Component<{ variant: HeaderNavVariant }> = ({
  className,
  variant,
}) => {
  const headerMenuConfig = useHeaderConfigValue('configAtom')
  const { ensureMenuData } = useHeaderConfig()
  const pathname = usePathname()
  const t = useTranslations('common')
  const navDebugMode = useNavDebugMode()
  const isStrip = variant === 'strip'

  const [menuValue, setMenuValue] = useState<string | null>(null)
  const handleValueChange = useCallback(
    (value: string | null) => {
      if (navDebugMode && value == null) return
      if (value) {
        const section = headerMenuConfig.find((item) => item.path === value)
        if (section?.type) {
          ensureMenuData(section.type as Parameters<typeof ensureMenuData>[0])
        }
      }
      setMenuValue(value)
    },
    [ensureMenuData, headerMenuConfig, navDebugMode],
  )

  const getTitle = useCallback(
    (item: Pick<IHeaderMenu, 'title' | 'titleKey'>) =>
      item.titleKey ? t(item.titleKey as any) : item.title,
    [t],
  )

  const hasActiveSection = useMemo(
    () =>
      headerMenuConfig.some(
        (section) => resolveSectionState(pathname, section).isActive,
      ),
    [headerMenuConfig, pathname],
  )

  const instanceId = useId().replaceAll(/[^\da-z]/g, '')
  const strokeAnchor = `--nav-active-label-${instanceId}`
  const supportsAnchor = useSyncExternalStore(
    subscribeNoop,
    cssAnchorPositioningSupported,
    () => false,
  )
  const followerReady = supportsAnchor && hasActiveSection

  const strokeFollowerStyle = useMemo(
    (): React.CSSProperties | undefined =>
      supportsAnchor
        ? ({
            position: 'absolute',
            positionAnchor: strokeAnchor,
            left: 'calc(anchor(left) - 5px)',
            width: 'calc(anchor-size(width) + 10px)',
            top: 'calc(anchor(bottom) + 1px)',
            transition: STROKE_TRANSITION,
            opacity: followerReady ? 1 : 0,
          } as React.CSSProperties)
        : undefined,
    [followerReady, strokeAnchor, supportsAnchor],
  )

  const renderLabel = (isActive: boolean, title: string) => (
    <span
      className="relative inline-block"
      style={
        isActive && supportsAnchor
          ? ({ anchorName: strokeAnchor } as React.CSSProperties)
          : undefined
      }
    >
      {title}
      {isActive && !supportsAnchor && (
        <InkStroke className="absolute -left-[5px] top-[calc(100%+1px)] w-[calc(100%+10px)]" />
      )}
    </span>
  )

  const itemClassName = (isActive: boolean) =>
    clsxm(
      'relative z-[1] inline-flex cursor-pointer items-center whitespace-nowrap border-none bg-transparent py-1.5 outline-none transition-colors duration-200',
      isStrip ? 'px-3' : 'px-3.5',
      isActive
        ? 'text-neutral-10'
        : 'text-neutral-7 hover:text-neutral-10 data-[popup-open]:text-neutral-10',
      'focus-visible:text-neutral-10 focus-visible:underline focus-visible:decoration-accent/50 focus-visible:decoration-2 focus-visible:underline-offset-[6px]',
    )

  return (
    <NavigationMenu.Root
      closeDelay={150}
      delay={80}
      render={<nav data-header-nav={variant} />}
      value={menuValue}
      className={clsxm(
        'pointer-events-auto relative',
        isStrip ? 'text-[13.5px]' : 'text-base',
        className,
      )}
      onValueChange={handleValueChange}
    >
      <NavigationMenu.List className="flex list-none items-center font-medium">
        {headerMenuConfig.map((section) => {
          const DropdownContent = section.type
            ? dropdownTypeMap[section.type]
            : undefined
          const { isActive, activeSubItem } = resolveSectionState(
            pathname,
            section,
          )
          const title = getTitle(activeSubItem ?? section)

          let href = section.path
          if (section.search) {
            href += `?${new URLSearchParams(section.search).toString()}`
          }

          if (DropdownContent) {
            return (
              <NavigationMenu.Item key={section.path} value={section.path}>
                <NavigationMenu.Trigger
                  className={itemClassName(isActive)}
                  nativeButton={false}
                  render={
                    <Link
                      href={href}
                      // Hover opens the mega menu only; clicks follow the Link (closes panel).
                      // Base UI merges render props before internal handlers — use preventBaseUIHandler
                      // so pointer/click handlers from useClick + Trigger do not keep the viewport open.
                      onClick={(
                        e: BaseUIEvent<React.MouseEvent<HTMLAnchorElement>>,
                      ) => {
                        section.do?.(e as React.MouseEvent<HTMLAnchorElement>)
                        e.preventBaseUIHandler()
                        setMenuValue(null)
                      }}
                      onMouseDown={(
                        e: BaseUIEvent<React.MouseEvent<HTMLAnchorElement>>,
                      ) => {
                        e.preventBaseUIHandler()
                      }}
                    />
                  }
                >
                  {renderLabel(isActive, title)}
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="nav-menu-content">
                  <DropdownContent section={section} />
                </NavigationMenu.Content>
              </NavigationMenu.Item>
            )
          }

          const isExternal = href.startsWith('http')
          return (
            <NavigationMenu.Item key={section.path}>
              <NavigationMenu.Link
                active={isActive}
                className={itemClassName(isActive)}
                render={
                  isExternal ? (
                    <a href={href} target="_blank" />
                  ) : (
                    <Link href={href} onClick={section.do} />
                  )
                }
              >
                {renderLabel(isActive, title)}
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          )
        })}
      </NavigationMenu.List>

      {supportsAnchor && <InkStroke style={strokeFollowerStyle} />}

      <NavigationMenu.Portal>
        <NavigationMenu.Positioner
          align="center"
          className="nav-menu-positioner"
          positionMethod="fixed"
          side="bottom"
          sideOffset={isStrip ? -2 : 12}
        >
          <NavigationMenu.Popup
            className={clsxm(
              'nav-menu-popup select-none outline-hidden',
              paperPanelHostClassName,
            )}
          >
            <PaperPanelSurface />
            <NavigationMenu.Viewport className="nav-menu-viewport" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  )
}
