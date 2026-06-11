import { useMemo, useState, type MouseEvent } from 'react'
import KeyboardAltOutlinedIcon from '@mui/icons-material/KeyboardAltOutlined'
import IconButton from '@mui/material/IconButton'
import { statusBarMuiIconButtonSx } from '../menu/statusBarUi'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import { useDispatch } from 'react-redux'
import {
  clearKeyboardListening,
  midiSetIsEditing,
  midiSetKeyboardLearnMode,
  removeKeyboardChord,
} from '../redux/controlSlice'
import { useDeviceSelector } from '../redux/store'
import { formatChordId } from '../input/keyboardChord'

export function KeyboardShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const dispatch = useDispatch()
  const shortcuts = useDeviceSelector((s) => s.keyboardShortcuts)
  const rows = useMemo(
    () =>
      Object.entries(shortcuts).map(([chordId, v]) => ({
        chordId,
        action: v.action,
      })),
    [shortcuts]
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Keyboard shortcuts</DialogTitle>
      <DialogContent>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Shortcut</TableCell>
              <TableCell>Action</TableCell>
              <TableCell align="right"> </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  No shortcuts yet. Use <strong>Assign keys</strong> on the keyboard
                  icon, click a control, then press the desired key or combination.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ chordId, action }) => (
                <TableRow key={chordId}>
                  <TableCell>{formatChordId(chordId)}</TableCell>
                  <TableCell>{action.type}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={() => dispatch(removeKeyboardChord(chordId))}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

/** Status bar keyboard icon: menu when idle; click again to exit assignment mode. */
export default function KeyboardShortcutMenuButton() {
  const dispatch = useDispatch()
  const keyboardLearnMode = useDeviceSelector((state) => state.keyboardLearnMode)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const menuOpen = menuAnchor !== null

  const exitAssignmentMode = () => {
    dispatch(clearKeyboardListening())
    dispatch(midiSetKeyboardLearnMode(false))
  }

  const startAssignmentMode = () => {
    dispatch(midiSetIsEditing(false))
    dispatch(clearKeyboardListening())
    dispatch(midiSetKeyboardLearnMode(true))
  }

  const handleButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (keyboardLearnMode) {
      exitAssignmentMode()
      return
    }
    setMenuAnchor(event.currentTarget)
  }

  const closeMenu = () => {
    setMenuAnchor(null)
  }

  return (
    <>
      <IconButton
        title={
          keyboardLearnMode
            ? 'Exit keyboard assignment mode (Esc)'
            : 'Keyboard shortcuts: assign keys or view current mappings'
        }
        onClick={handleButtonClick}
        size="small"
        sx={{
          ...statusBarMuiIconButtonSx,
          color: keyboardLearnMode ? 'success.main' : 'text.secondary',
        }}
      >
        <KeyboardAltOutlinedIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            startAssignmentMode()
            closeMenu()
          }}
        >
          Assign keys
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDialogOpen(true)
            closeMenu()
          }}
        >
          View assigned keys
        </MenuItem>
      </Menu>
      <KeyboardShortcutsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  )
}
