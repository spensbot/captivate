import Tooltip, { type TooltipProps } from '@mui/material/Tooltip'
import { createElement, type ReactElement } from 'react'

/** Shared MUI tooltip styling — also applied via theme in renderer/remote entrypoints. */
export const APP_TOOLTIP_SX = {
  maxWidth: '22rem',
  py: 1,
  px: 1.15,
  lineHeight: 1.45,
  fontSize: '0.78rem',
} as const

export const APP_TOOLTIP_SLOT_PROPS: TooltipProps['slotProps'] = {
  tooltip: { sx: APP_TOOLTIP_SX },
}

export const APP_TOOLTIP_DEFAULTS = {
  enterDelay: 400,
  placement: 'top' as const,
  slotProps: APP_TOOLTIP_SLOT_PROPS,
}

type BriefTooltipProps = {
  title: NonNullable<TooltipProps['title']>
  children: ReactElement
  placement?: TooltipProps['placement']
}

/** MUI tooltip with shared app styling — wrap disabled controls in a span first. */
export function BriefTooltip({
  title,
  children,
  placement = 'top',
}: BriefTooltipProps) {
  return createElement(Tooltip, {
    ...APP_TOOLTIP_DEFAULTS,
    title,
    placement,
    children,
  })
}
