import styled from 'styled-components'
import {
  useTypedSelector,
  undoActionTypes,
  UndoGroup,
  ReduxState,
} from '../redux/store'
import { useDispatch } from 'react-redux'
import UndoIcon from '@mui/icons-material/Undo'
import RedoIcon from '@mui/icons-material/Redo'
import IconButton from '@mui/material/IconButton'
import { statusBarMuiIconButtonSx } from '../menu/statusBarUi'

export function undoAction(group: UndoGroup) {
  return {
    type: undoActionTypes[group].undo,
  }
}

export function redoAction(group: UndoGroup) {
  return {
    type: undoActionTypes[group].redo,
  }
}

export function getUndoGroup(state: ReduxState): UndoGroup | null {
  if (state.gui.activePage === 'Universe' || state.gui.activePage === 'Movers') return 'dmx'
  else if (state.gui.activePage === 'Modulation' || state.gui.activePage === 'Video')
    return 'control'
  return null
}

export default function UndoRedo() {
  const group = useTypedSelector(getUndoGroup)
  const canUndo = useTypedSelector((state) =>
    group ? state[group].past.length > 0 : false
  )
  const canRedo = useTypedSelector((state) =>
    group ? state[group].future.length > 0 : false
  )
  const dispatch = useDispatch()

  if (group === null) return null

  function onUndo(_group: UndoGroup) {
    return () => dispatch(undoAction(_group))
  }

  function onRedo(_group: UndoGroup) {
    return () => dispatch(redoAction(_group))
  }

  return (
    <Root>
      <IconButton disabled={!canUndo} onClick={onUndo(group)} size="small" sx={statusBarMuiIconButtonSx}>
        <UndoIcon fontSize="small" />
      </IconButton>
      <IconButton disabled={!canRedo} onClick={onRedo(group)} size="small" sx={statusBarMuiIconButtonSx}>
        <RedoIcon fontSize="small" />
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
`

