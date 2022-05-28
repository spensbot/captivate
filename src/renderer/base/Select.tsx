import MuiSelect from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

interface Props<T extends string> {
  label: string
  val: T
  items: T[]
  onChange: (newVal: T) => void
  style?: React.CSSProperties
}

export default function Select<T extends string>({
  label,
  val,
  items,
  onChange,
  style,
}: Props<T>) {
  return (
    <MuiSelect
      labelId="select-label"
      id="select-id"
      value={val}
      label={label}
      variant="standard"
      onChange={(e) => onChange(e.target.value as T)}
      style={style}
    >
      {items.map((item) => (
        <MenuItem key={item} value={item}>
          {item}
        </MenuItem>
      ))}
    </MuiSelect>
  )
}
