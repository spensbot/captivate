import styled from 'styled-components'
import MuiSelect from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

interface Props<T> {
  label: string
  val: T
  items: T[]
  onChange: (newVal: T) => void
}

export default function Select<T>({ label, val, items, onChange }: Props<T>) {
  return (
    <MuiSelect
      labelId="select-label"
      id="select-id"
      value={val}
      label={label}
      size="small"
      variant="standard"
      onChange={(e) => onChange(e.target.value)}
    >
      {items.map((item) => (
        <MenuItem key={item} value={item}>
          {item}
        </MenuItem>
      ))}
    </MuiSelect>
  )
}
