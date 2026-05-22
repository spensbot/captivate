import KeyboardAltOutlinedIcon from '@mui/icons-material/KeyboardAltOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import {
  clearKeyboardListening,
  midiSetIsEditing,
  midiSetKeyboardLearnMode,
} from '../redux/controlSlice'
import { useDeviceSelector } from '../redux/store'

/**
 * Detached page windows hide the main StatusBar; show a compact exit affordance
 * while keyboard/MIDI assignment overlays are active.
 */
export default function DetachedKeyboardMappingBar() {
  const keyboardLearnMode = useDeviceSelector((state) => state.keyboardLearnMode)
  const keyboardListening = useDeviceSelector((state) => state.keyboardListening)
  const isEditing = useDeviceSelector((state) => state.isEditing)
  const dispatch = useDispatch()

  if (!keyboardLearnMode && !keyboardListening && !isEditing) {
    return null
  }

  const exitMapping = () => {
    dispatch(clearKeyboardListening())
    dispatch(midiSetKeyboardLearnMode(false))
    dispatch(midiSetIsEditing(false))
  }

  return (
    <Root>
      <Label>
        <KeyboardAltOutlinedIcon sx={{ fontSize: '1rem' }} />
        {keyboardListening
          ? 'Press a key to assign (Esc exits mapping)'
          : isEditing
            ? 'MIDI mapping mode (Esc exits)'
            : 'Keyboard mapping mode (Esc exits)'}
      </Label>
      <ExitButton type="button" onClick={exitMapping} title="Exit mapping mode (Esc)">
        <CloseIcon sx={{ fontSize: '0.95rem' }} />
        Exit mapping
      </ExitButton>
    </Root>
  )
}

const Root = styled.div`
  position: absolute;
  top: 0.35rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 600;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.28rem 0.55rem;
  border-radius: 0.35rem;
  background: rgba(12, 28, 18, 0.92);
  border: 1px solid rgba(120, 220, 140, 0.45);
  box-shadow: 0 0.2rem 0.75rem rgba(0, 0, 0, 0.35);
  pointer-events: auto;
`

const Label = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #d8f5dc;
  white-space: nowrap;
`

const ExitButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 0.28rem;
  padding: 0.18rem 0.42rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: #e8eefc;
  background: rgba(40, 70, 50, 0.85);
  cursor: pointer;

  &:hover {
    background: rgba(55, 95, 65, 0.95);
  }
`
