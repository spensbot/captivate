import { TextField } from '@mui/material'
import { clampMaybe } from '../../util/util'

interface Props2 {
  val: number
  label: string
  onChange: (newVal: number) => void
  min?: number
  max?: number
}

export default function NumberField({
  val,
  label,
  onChange,
  min,
  max,
}: Props2) {
  return (
    <TextField
      value={val.toString()}
      label={label}
      size="small"
      variant="standard"
      onChange={(e) => onChange(clampMaybe(parseInt(e.target.value), min, max))}
      type="number"
    />
  )
}
