import { useCallback, useState } from 'react'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemText from '@mui/material/ListItemText'
import { listScreenDisplays, send_open_page_window } from '../ipcHandler'
import type { ScreenDisplayChoice } from '../../shared/screenDisplays'

export default function OpenVisualizerButton() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [displays, setDisplays] = useState<ScreenDisplayChoice[]>([])
  const [loadError, setLoadError] = useState(false)

  const openMenu = useCallback(async (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
    setLoadError(false)
    try {
      const list = await listScreenDisplays()
      setDisplays(list)
    } catch {
      setDisplays([])
      setLoadError(true)
    }
  }, [])

  const closeMenu = () => setAnchorEl(null)

  const openViewport = (displayId?: number) => {
    send_open_page_window(
      'VideoViewport',
      displayId !== undefined ? { displayId } : undefined
    )
    closeMenu()
  }

  return (
    <>
      <Button
        size="small"
        variant="text"
        color="inherit"
        onClick={openMenu}
        title="Open detached viewport — choose display"
        aria-haspopup="menu"
        aria-expanded={anchorEl !== null}
        sx={{
          minWidth: 0,
          px: 0.45,
          color: 'text.primary',
          '&:hover': { color: 'text.primary' },
        }}
      >
        <OpenInNewIcon fontSize="small" />
        <ArrowDropDownIcon sx={{ fontSize: '1rem', ml: 0.15 }} />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={anchorEl !== null}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              maxWidth: 'min(24rem, calc(100vw - 24px))',
            },
          },
        }}
      >
        <MenuItem onClick={() => openViewport(undefined)}>
          <ListItemText
            primary="Default"
            secondary="Let the OS place the window (same as before)"
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
        {loadError ? (
          <MenuItem disabled>
            <ListItemText primary="Could not list displays" />
          </MenuItem>
        ) : null}
        {displays.map((d) => (
          <MenuItem key={d.id} onClick={() => openViewport(d.id)}>
            <ListItemText primary={d.label} primaryTypographyProps={{ variant: 'body2' }} />
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
