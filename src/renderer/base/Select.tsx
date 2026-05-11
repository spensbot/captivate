import { useRef } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import MuiSelect from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import zIndexes from '../zIndexes'

/** Menu list sizing only — z-index must be on the Modal root, not Paper (see below). */
const selectMenuPaperSx: SxProps<Theme> = {
  maxWidth: 'min(100vw - 32px, 28rem)',
  maxHeight: 'min(50vh, 22rem)',
}

/** MUI Menu uses Modal with theme.zIndex.modal (~1300). AppModal is fullscreenOverlay+2 (~10002). */
const selectMenuModalZIndex = zIndexes.fullscreenOverlay + 60

interface Props<T extends string> {
  label: string
  val: T
  items: T[]
  onChange: (newVal: T) => void
  style?: React.CSSProperties
  sx?: SxProps<Theme>
  labelForItem?: (item: T) => string
  disabled?: boolean
  /** When true (default), control grows/shrinks with flex parents and menus stay on-screen. */
  fullWidth?: boolean
}

export default function Select<T extends string>({
  label,
  val,
  items,
  onChange,
  style,
  sx,
  labelForItem,
  disabled = false,
  fullWidth = true,
}: Props<T>) {
  const idRef = useRef(
    `select-${Math.random().toString(36).slice(2, 10)}`
  )
  const selectId = idRef.current
  const labelId = `${idRef.current}-label`

  const layoutSx: SxProps<Theme> = fullWidth
    ? {
        minWidth: 0,
        maxWidth: '100%',
        width: '100%',
      }
    : {
        minWidth: 0,
        maxWidth: '100%',
      }

  return (
    <MuiSelect
      labelId={labelId}
      id={selectId}
      value={val}
      label={label}
      title={label}
      variant="standard"
      disabled={disabled}
      fullWidth={fullWidth}
      onChange={(e) => onChange(e.target.value as T)}
      style={style}
      sx={[layoutSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      MenuProps={{
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: 'top', horizontal: 'left' },
        slotProps: {
          root: {
            sx: { zIndex: selectMenuModalZIndex },
          },
          paper: {
            sx: selectMenuPaperSx,
          },
        },
      }}
    >
      {items.map((item) => (
        <MenuItem key={item} value={item}>
          {labelForItem ? labelForItem(item) : item}
        </MenuItem>
      ))}
    </MuiSelect>
  )
}
