import { useEffect, useRef, useState } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import { TextField } from '@mui/material'
import type { StageUnit } from '../../shared/stage'
import {
  clampImperialFeet,
  parseImperialLengthToDecimalFeet,
} from '../../shared/imperialLength'
import {
  clampMetricMeters,
  formatMetricMetersForDraft,
  parseMetricLengthToMeters,
} from '../../shared/metricLength'

type Props = {
  val: number
  label: string
  onChange: (newVal: number) => void
  min?: number
  max?: number
  numberType?: 'int' | 'float'
  variant?: 'standard' | 'outlined' | 'filled'
  step?: number
  disabled?: boolean
  title?: string
  highlightOnFocus?: boolean
  /** `ft`: decimal feet and feet-inches. `m`: meters, cm, mm, or plain meters. */
  stageUnit: StageUnit
  sx?: SxProps<Theme>
}

export default function StageLengthField({
  val,
  label,
  onChange,
  min,
  max,
  numberType = 'float',
  variant = 'standard',
  disabled = false,
  title,
  highlightOnFocus = false,
  stageUnit,
  sx: sxProp,
}: Props) {
  const [draft, setDraft] = useState(() => formatDraft(val, stageUnit))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(formatDraft(val, stageUnit))
    }
  }, [val, stageUnit])

  const responsiveSx: SxProps<Theme> = {
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
  }

  const focusSx: SxProps<Theme> | undefined = highlightOnFocus
    ? {
        '& .MuiInputBase-root': {
          borderRadius: '4px',
          transition: 'background-color 120ms ease, box-shadow 120ms ease',
        },
        '& .MuiInputBase-root:hover': {
          backgroundColor: 'rgba(95, 140, 220, 0.08)',
        },
        '& .MuiInputBase-root.Mui-focused': {
          backgroundColor: 'rgba(95, 140, 220, 0.18)',
          boxShadow: '0 0 0 1px rgba(95, 140, 220, 0.45) inset',
        },
      }
    : undefined

  const mergedSx: SxProps<Theme> = [
    responsiveSx,
    ...(focusSx ? [focusSx] : []),
    ...(Array.isArray(sxProp) ? sxProp : sxProp ? [sxProp] : []),
  ]

  const defaultTitle =
    stageUnit === 'ft'
      ? `Decimal feet (e.g. 10.5) or feet-inches (e.g. 1' - 10", 2'6")`
      : `Meters (e.g. 2.4), or 240 cm, 2400 mm, 2.5 m`

  function commitFromDraft() {
    focusedRef.current = false
    if (stageUnit === 'ft') {
      const parsed = parseImperialLengthToDecimalFeet(draft)
      if (parsed === null) {
        setDraft(formatDraft(val, stageUnit))
        return
      }
      const clamped = clampImperialFeet(parsed, min, max)
      onChange(numberType === 'int' ? Math.round(clamped) : clamped)
      setDraft(formatDraft(clamped, stageUnit))
      return
    }

    const parsed = parseMetricLengthToMeters(draft)
    if (parsed === null) {
      setDraft(formatDraft(val, stageUnit))
      return
    }
    const clamped = clampMetricMeters(parsed, min, max)
    const next = numberType === 'int' ? Math.round(clamped) : clamped
    onChange(next)
    setDraft(formatDraft(next, stageUnit))
  }

  return (
    <TextField
      value={draft}
      label={label}
      size="small"
      variant={variant}
      disabled={disabled}
      onFocus={() => {
        focusedRef.current = true
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commitFromDraft}
      type="text"
      inputMode="decimal"
      title={title ?? defaultTitle}
      sx={mergedSx}
    />
  )
}

function formatDraft(val: number, unit: StageUnit): string {
  if (!Number.isFinite(val)) return ''
  if (unit === 'm') {
    return formatMetricMetersForDraft(val)
  }
  return String(Number(val.toFixed(4)))
}
