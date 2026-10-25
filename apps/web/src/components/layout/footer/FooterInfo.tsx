'use client'

import { useTranslations } from 'next-intl'
import type { JSX, ReactNode } from 'react'

import { SubscribeTextButton } from '~/components/modules/subscribe/SubscribeTextButton'
import { FloatPopover } from '~/components/ui/float-popover'
import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import type { FooterConfig } from './config'
import { getDefaultLinkSections } from './config'
import { CropMarks } from './CropMarks'
import { Heartbeat } from './GatewayInfo'
import { OwnerName } from './OwnerName'

interface FooterInfoProps {
  backgroundSwitcher: ReactNode
  bgmSwitcher: ReactNode
  footerConfig?: FooterConfig
  localeSwitcher: ReactNode
  themeSwitcher: ReactNode
}

const linkClass =
  'self-start text-copy-13 leading-[26px] text-neutral-8 hover:underline hover:decoration-current/30 hover:underline-offset-2'

export const FooterInfo = ({
  localeSwitcher,
  themeSwitcher,
  bgmSwitcher,
  backgroundSwitcher,
  footerConfig: footerConfigProp,
}: FooterInfoProps) => {
  const t = useTranslations('common')
  const socialIds = useAggregationSelector((state) => state.user.socialIds)
  const footerConfig: FooterConfig = footerConfigProp || {
    linkSections: getDefaultLinkSections(t, socialIds || undefined),
    otherInfo: {} as any,
  }
  const { otherInfo, linkSections } = footerConfig
  const currentYear = new Date().getFullYear().toString()
  const { date: dateRaw, icp } = otherInfo || {}
  const copyrightDate = (dateRaw || currentYear).replace('{{now}}', currentYear)

  return (
    <>
      <div className="relative isolate md:px-12 md:py-9">
        <div
          aria-hidden
          className="paper-panel-color absolute inset-0 -z-1 hidden md:block"
        />
        <CropMarks />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <a
              className="font-serif text-[22px] font-semibold leading-none tracking-[0.04em] text-neutral-9"
              href="/"
            >
              <OwnerName />
            </a>
            <span className="font-serif text-copy-13 italic text-neutral-7">
              {t('footer_motto')}
            </span>
          </div>
          <Heartbeat />
        </div>

        <div className="paper-hairline my-6 border-t md:mb-[22px] md:mt-[26px]" />

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-flow-col lg:grid-cols-none lg:auto-cols-fr">
          {linkSections.map((section, i) => (
            <Column index={i + 1} key={section.name} title={section.name}>
              {section.links.map((link) => (
                <StyledLink
                  className={linkClass}
                  external={link.external}
                  href={link.href}
                  key={link.href}
                >
                  {link.name}
                </StyledLink>
              ))}
            </Column>
          ))}
          <Column
            index={linkSections.length + 1}
            title={t('footer_section_follow')}
          >
            <a
              className={linkClass}
              href="/feed"
              rel="noreferrer"
              target="_blank"
            >
              {t('rss_subscribe')}
            </a>
            <a
              className={linkClass}
              href="/sitemap.xml"
              rel="noreferrer"
              target="_blank"
            >
              {t('sitemap')}
            </a>
            <span className={linkClass}>
              <SubscribeTextButton />
            </span>
          </Column>
          <Column
            className="col-span-2 sm:col-span-4 lg:col-span-1"
            index={linkSections.length + 2}
            title={t('footer_section_settings')}
          >
            <div className="flex flex-col items-start text-label-12 leading-[26px] text-neutral-6">
              {themeSwitcher}
              {bgmSwitcher}
              {localeSwitcher}
              {backgroundSwitcher}
            </div>
          </Column>
        </div>
      </div>

      <Colophon copyrightDate={copyrightDate} icp={icp} />
    </>
  )
}

const Column = ({
  index,
  title,
  className,
  children,
}: {
  index: number
  title: string
  className?: string
  children: ReactNode
}) => (
  <div className={clsxm('flex min-w-0 flex-col', className)}>
    <span className="mb-1 font-mono text-caption-10 tracking-[0.1em] text-neutral-6">
      {String(index).padStart(2, '0')} {title}
    </span>
    {children}
  </div>
)

const Colophon = ({
  copyrightDate,
  icp,
}: {
  copyrightDate: string
  icp?: FooterConfig['otherInfo']['icp']
}) => {
  const hash = process.env.COMMIT_HASH
  const buildTime = process.env.BUILD_TIME

  return (
    <div className="mt-8 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-mono text-caption-10 uppercase tracking-[0.06em] text-neutral-6 md:mt-9">
      <YohakuLink />
      {hash && process.env.COMMIT_URL && (
        <>
          <Dash />
          <SlugLink className="normal-case" href={process.env.COMMIT_URL}>
            {hash.slice(0, 8)}
          </SlugLink>
        </>
      )}
      {buildTime && (
        <>
          <Dash />
          <span>{formatSlugDate(buildTime)}</span>
          <Dash />
          <SlugLink href="https://github.com/mx-space">Mix Space</SlugLink>
        </>
      )}
      <Dash />
      <span>
        © {copyrightDate} <OwnerName />
      </span>
      {icp && (
        <>
          <Dash />
          <SlugLink href={icp.link}>{icp.text}</SlugLink>
        </>
      )}
    </div>
  )
}

const formatSlugDate = (time: string) => {
  const date = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}`
}

const YohakuLink = () => {
  const t = useTranslations('common')
  const rich = (key: string, href: string) =>
    t.rich(key, {
      link: (chunks) => (
        <StyledLink
          external
          className="underline decoration-current/30 underline-offset-2"
          href={href}
        >
          {chunks}
        </StyledLink>
      ),
    })

  return (
    <FloatPopover
      asChild
      mobileAsSheet
      as="span"
      type="tooltip"
      triggerElement={
        <SlugLink
          className="cursor-help"
          href="https://github.com/Innei/Yohaku"
        >
          余白 / Yohaku
        </SlugLink>
      }
    >
      <div className="max-w-xs space-y-2 text-copy-13 normal-case leading-relaxed tracking-normal">
        <p>{rich('yohaku_footer_line', 'https://github.com/Innei/Yohaku')}</p>
        <p>
          {rich('yohaku_footer_sponsor', 'https://github.com/sponsors/Innei')}
        </p>
      </div>
    </FloatPopover>
  )
}

const SlugLink = ({ className, ...props }: JSX.IntrinsicElements['a']) => (
  <a
    rel="noreferrer"
    target="_blank"
    className={clsxm(
      'border-b border-transparent transition-colors hover:border-neutral-5 hover:text-neutral-8',
      className,
    )}
    {...props}
  />
)

const Dash = () => (
  <span aria-hidden className="select-none text-neutral-5">
    —
  </span>
)

const StyledLink = (
  props: JSX.IntrinsicElements['a'] & {
    external?: boolean
  },
) => {
  const { external, ...rest } = props
  const As = external ? 'a' : Link

  return (
    // @ts-ignore
    <As
      rel={external ? 'noreferrer' : undefined}
      target={external ? '_blank' : props.target}
      {...rest}
    >
      {props.children}
      {external && <span className="ml-0.5 text-neutral-6">↗</span>}
    </As>
  )
}
