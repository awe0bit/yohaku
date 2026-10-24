'use client'

import { useQuery } from '@tanstack/react-query'
import Markdown from 'markdown-to-jsx'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'
import { useCallback, useRef } from 'react'

import { NotSupport } from '~/components/common/NotSupport'
import { Avatar } from '~/components/ui/avatar'
import { StyledButton } from '~/components/ui/button'
import type { FormContextType } from '~/components/ui/form'
import { Form, FormInput } from '~/components/ui/form'
import { useModalStack } from '~/components/ui/modal'
import { apiClient } from '~/lib/request'
import { toast } from '~/lib/toast'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

export const ApplyLinkInfo: FC = () => {
  const t = useTranslations('friends')
  const {
    seo,
    user: { avatar, name, introduce },
  } = useAggregationSelector((a) => ({
    seo: a.seo!,
    user: a.user!,
  }))!

  const { data: canApply } = useQuery({
    queryKey: ['can-apply'],
    queryFn: () => apiClient.link.canApplyLink(),
    initialData: true,
    refetchOnMount: 'always',
  })
  const { present } = useModalStack()
  if (!canApply) {
    return <NotSupport className="mt-20" text={t('apply_disabled')} />
  }

  const siteUrl = `${location.protocol}//${location.host}`
  const details = [
    [
      t('info_title'),
      <a className="text-accent" href={siteUrl} key="title">
        {seo.title}
      </a>,
    ],
    [t('info_description'), seo.description],
    [
      t('info_avatar'),
      <a
        className="text-accent"
        href={avatar}
        key="avatar"
        rel="noreferrer"
        target="_blank"
      >
        {t('info_avatar_download')}
      </a>,
    ],
    [t('info_name'), name],
  ] as const

  return (
    <section className="mt-16 grid grid-cols-1 items-start gap-8 border-t border-black/[0.08] pt-8 md:grid-cols-[1fr_340px] md:gap-12 dark:border-white/10">
      <div>
        <div className="font-mono text-caption-10 uppercase tracking-[1.5px] text-neutral-6">
          {t('apply_eyebrow')}
        </div>
        <h2 className="mt-2.5 font-serif text-title-24 font-medium text-neutral-10">
          {t('apply_title')}
        </h2>
        <Markdown className="mt-4 list-disc pl-4 text-copy-13 text-neutral-7 marker:text-neutral-5 [&_li]:mt-2 [&_strong]:font-medium [&_strong]:text-neutral-9">
          {[
            t('rule_mutual'),
            t('rule_unavailable'),
            t('rule_content'),
            t('rule_https'),
            t('rule_domain'),
            t('rule_personal'),
          ].join('\n')}
        </Markdown>
      </div>

      <div className="rounded-xl bg-paper p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] ring-1 ring-border">
        <div className="flex items-center gap-2.5 border-b border-black/[0.08] pb-3 dark:border-white/10">
          <Avatar alt="" size={36} src={avatar} text={name} />
          <div className="min-w-0">
            <div className="text-copy-13 font-medium text-neutral-10">
              {name}
            </div>
            {introduce && (
              <div className="truncate text-label-12 text-neutral-7">
                {introduce}
              </div>
            )}
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-[64px_1fr] gap-x-3 gap-y-2 text-label-12">
          {details.map(([label, value]) => (
            <div className="contents" key={label}>
              <dt className="text-neutral-6">{label}</dt>
              <dd className="m-0 text-neutral-8">{value}</dd>
            </div>
          ))}
        </dl>
        <StyledButton
          className="mt-4 w-full"
          variant="primary"
          onClick={() => {
            present({
              title: t('apply_modal_title'),
              content: () => <FormModal />,
            })
          }}
        >
          {t('apply_button')}
        </StyledButton>
      </div>
    </section>
  )
}

const FormModal = () => {
  const t = useTranslations('friends')
  const { dismissTop } = useModalStack()
  const inputs = [
    {
      name: 'author',
      label: t('form_nickname'),
      placeholder: 'innei',
      rules: [
        {
          validator: (value: string) => !!value,
          message: t('validation_nickname_required'),
        },
        {
          validator: (value: string) => value.length <= 20,
          message: t('validation_nickname_length'),
        },
      ],
    },
    {
      name: 'name',
      label: t('form_site_title'),
      placeholder: 'Yohaku',
      rules: [
        {
          validator: (value: string) => !!value,
          message: t('validation_title_required'),
        },
        {
          validator: (value: string) => value.length <= 20,
          message: t('validation_title_length'),
        },
      ],
    },
    {
      name: 'url',
      label: t('form_url'),
      placeholder: 'https://',
      rules: [
        {
          validator: isHttpsUrl,
          message: t('validation_url'),
        },
      ],
    },
    {
      name: 'avatar',
      label: t('form_avatar'),
      placeholder: 'https://',
      rules: [
        {
          validator: isHttpsUrl,
          message: t('validation_avatar'),
        },
      ],
    },
    {
      name: 'email',
      label: t('form_email'),
      placeholder: 'mail@example.com',

      rules: [
        {
          validator: isEmail,
          message: t('validation_email'),
        },
      ],
    },
    {
      name: 'description',
      label: t('form_description'),
      placeholder: '...',

      rules: [
        {
          validator: (value: string) => !!value,
          message: t('validation_description_required'),
        },
        {
          validator: (value: string) => value.length <= 50,
          message: t('validation_description_length'),
        },
      ],
    },
  ]

  const formRef = useRef<FormContextType>(null)

  const handleSubmit = useCallback(
    (e: any) => {
      e.preventDefault()
      const currentValues = formRef.current?.getCurrentValues()
      if (!currentValues) return

      apiClient.link
        .applyLink({ ...(currentValues as any) })
        .catch((err) => {
          console.error('[friends] applyLink failed:', err)
        })
        .finally(() => {
          dismissTop()
          toast.success(t('submit_success'))
        })
    },
    [dismissTop, t],
  )

  return (
    <Form
      className="flex w-full flex-col gap-4 text-left lg:w-[420px]"
      ref={formRef}
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
        <FormInput {...inputs[0]} />
        <FormInput {...inputs[1]} />

        <FormInput {...inputs[2]} />
        <FormInput {...inputs[3]} />
      </div>

      <div className="flex flex-col gap-3">
        <FormInput {...inputs[4]} />
        <FormInput {...inputs[5]} />
      </div>

      <div className="mt-2 flex justify-end">
        <StyledButton type="submit" variant="primary">
          {t('submit_button')}
        </StyledButton>
      </div>
    </Form>
  )
}

const isHttpsUrl = (value: string) =>
  /^https?:\/\/.*/.test(value) &&
  (() => {
    try {
      const parsedUrl = new URL(value)
      return Boolean(parsedUrl)
    } catch {
      return false
    }
  })()

const isEmail = (value: string) =>
  /^.[^\n\r@\u2028\u2029]*@.[^\n\r.\u2028\u2029]*\..+$/.test(value)
