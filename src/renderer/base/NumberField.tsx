import { TextField } from '@mui/material'
import { clampMaybe } from '../../math/util'

interface Props2 {
  val: number
  label: string
  onChange: (newVal: number) => void
  min?: number
  max?: number
  numberType?: 'int' | 'float'
  variant?: 'standard' | 'outlined' | 'filled'
  onFocus?: () => void
  onBlur?: () => void
  onMouseDown?: () => void
  highlightOnFocus?: boolean
  title?: string
  step?: number
  disabled?: boolean
}

export default function NumberField({
  val,
  label,
  onChange,
  min,
  max,
  numberType = 'int',
  variant = 'standard',
  onFocus,
  onBlur,
  onMouseDown,
  highlightOnFocus = false,
  title,
  step,
  disabled = false,
}: Props2) {
  return (
    <TextField
      value={val.toString()}
      label={label}
      size="small"
      variant={variant}
      disabled={disabled}
      onChange={(e) => {
        if (numberType === 'int') {
          onChange(clampMaybe(parseInt(e.target.value), min, max))
        } else {
          onChange(clampMaybe(parseFloat(e.target.value), min, max))
        }
      }}
      onFocus={() => onFocus?.()}
      onBlur={() => onBlur?.()}
      onMouseDown={() => onMouseDown?.()}
      type="number"
      title={title}
      inputProps={step !== undefined ? { step } : undefined}
      sx={
        highlightOnFocus
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
      }
    />
  )
}

