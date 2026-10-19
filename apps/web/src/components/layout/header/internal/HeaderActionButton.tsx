import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { JSX } from 'react'

export const HeaderActionButton = ({
  ref,
  children,
  ...rest
}: JSX.IntrinsicElements['div'] & {
  ref?: React.RefObject<HTMLDivElement | null>
}) => {
  const t = useTranslations('common')
  return (
    <div
      role="button"
      tabIndex={1}
      className={clsx(
        'group size-10 rounded-full bg-neutral-2 text-neutral-7 transition-colors hover:text-neutral-10',

        'center flex',
      )}
      {...rest}
      aria-label={t('aria_header_action')}
      ref={ref}
    >
      {children}
    </div>
  )
}

HeaderActionButton.displayName = 'HeaderActionButton'
