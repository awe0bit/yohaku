'use client'

import './dropdown-menu.css'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import * as React from 'react'

import { cn } from '~/lib/helper'

import {
  InkTick,
  paperPanelHostClassName,
  PaperPanelSurface,
} from '../paper-panel'

const DropdownMenu = MenuPrimitive.Root

const DropdownMenuTrigger = ({
  ref,
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.Trigger> & {
  asChild?: boolean
} & {
  ref?: React.RefObject<HTMLButtonElement | null>
}) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <MenuPrimitive.Trigger
        ref={ref}
        {...props}
        render={children as React.ReactElement}
      />
    )
  }

  return (
    <MenuPrimitive.Trigger ref={ref} {...props}>
      {children}
    </MenuPrimitive.Trigger>
  )
}
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

const DropdownMenuGroup = MenuPrimitive.Group

const DropdownMenuPortal = MenuPrimitive.Portal

const DropdownMenuSub = MenuPrimitive.SubmenuRoot

const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = ({
  ref,
  className,
  inset,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubmenuTrigger> & {
  inset?: boolean
} & {
  ref?: React.RefObject<React.ElementRef<
    typeof MenuPrimitive.SubmenuTrigger
  > | null>
}) => (
  <MenuPrimitive.SubmenuTrigger
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center px-3 py-[7px] text-copy-13 text-neutral-8 outline-hidden',
      'data-[highlighted]:paper-wash data-[open]:paper-wash data-[highlighted]:text-neutral-10',
      inset && 'pl-8',
      className,
    )}
    {...props}
  >
    {children}
    <i className="i-mingcute-down-line ml-auto size-4" />
  </MenuPrimitive.SubmenuTrigger>
)
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger'

const DropdownMenuContent = ({
  ref,
  className,
  keepMounted = false,
  sideOffset = 4,
  side,
  align,
  alignOffset,

  positionMethod,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.Popup> & {
  sideOffset?: React.ComponentPropsWithoutRef<
    typeof MenuPrimitive.Positioner
  >['sideOffset']
  side?: React.ComponentPropsWithoutRef<typeof MenuPrimitive.Positioner>['side']
  align?: React.ComponentPropsWithoutRef<
    typeof MenuPrimitive.Positioner
  >['align']
  alignOffset?: React.ComponentPropsWithoutRef<
    typeof MenuPrimitive.Positioner
  >['alignOffset']
  keepMounted?: React.ComponentPropsWithoutRef<
    typeof MenuPrimitive.Portal
  >['keepMounted']
  positionMethod?: React.ComponentPropsWithoutRef<
    typeof MenuPrimitive.Positioner
  >['positionMethod']
} & {
  ref?: React.RefObject<React.ElementRef<typeof MenuPrimitive.Popup> | null>
}) => (
  <MenuPrimitive.Portal keepMounted={keepMounted}>
    <MenuPrimitive.Positioner
      align={align}
      alignOffset={alignOffset}
      className="z-50"
      positionMethod={positionMethod}
      side={side}
      sideOffset={sideOffset}
    >
      <MenuPrimitive.Popup
        ref={ref}
        className={cn(
          'dropdown-menu-popup min-w-32 px-1.5 py-2 text-neutral-9 outline-hidden',
          paperPanelHostClassName,
          className,
        )}
        {...props}
      >
        <PaperPanelSurface />
        {props.children}
      </MenuPrimitive.Popup>
    </MenuPrimitive.Positioner>
  </MenuPrimitive.Portal>
)
DropdownMenuContent.displayName = 'DropdownMenuContent'

const DropdownMenuItem = ({
  ref,
  className,
  inset,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item> & {
  inset?: boolean
  icon?: React.ReactNode
} & {
  ref?: React.RefObject<React.ElementRef<typeof MenuPrimitive.Item> | null>
}) => (
  <MenuPrimitive.Item
    ref={ref}
    className={cn(
      'group/item relative flex cursor-default select-none items-center px-3 py-[7px] text-copy-13 text-neutral-8 outline-hidden transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      'data-[highlighted]:paper-wash data-[highlighted]:text-neutral-10',
      inset && 'pl-8',
      'focus-within:!outline-transparent',
      className,
    )}
    {...props}
  >
    <InkTick className="hidden group-data-[highlighted]/item:block" />
    {props.icon && (
      <span className="mr-2.5 inline-flex size-4 items-center justify-center text-neutral-6 group-data-[highlighted]/item:text-neutral-8">
        {props.icon}
      </span>
    )}
    {props.children}
    {/* Justify Fill */}
    {props.icon && <span className="ml-1.5 size-4" />}
  </MenuPrimitive.Item>
)
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuLabel = ({
  ref,
  className,
  inset,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.GroupLabel> & {
  inset?: boolean
} & {
  ref?: React.RefObject<React.ElementRef<
    typeof MenuPrimitive.GroupLabel
  > | null>
}) => (
  <MenuPrimitive.GroupLabel
    ref={ref}
    className={cn(
      'px-3 pb-2 pt-1 text-label-12 font-normal tracking-[3px] text-neutral-6',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
)
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

const DropdownMenuSeparator = ({
  ref,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator> & {
  ref?: React.RefObject<React.ElementRef<typeof MenuPrimitive.Separator> | null>
}) => (
  <MenuPrimitive.Separator
    className={cn('paper-hairline mx-1.5 my-1 h-0 border-t-[0.5px]', className)}
    ref={ref}
    {...props}
  />
)
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      'ml-auto text-label-12 tracking-widest opacity-60',
      className,
    )}
    {...props}
  />
)
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
}
