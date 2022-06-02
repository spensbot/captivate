import AdjustIcon from '@mui/icons-material/Adjust'
import IconButton from '@mui/material/IconButton'
import { send_user_command } from '../ipcHandler'
import { ButtonMidiOverlay } from 'renderer/base/MidiOverlay'

interface Props {}

export default function TapTempo({}: Props) {
  return (
    <ButtonMidiOverlay
      action={{
        type: 'tapTempo',
      }}
    >
      <IconButton
        onClick={() =>
          send_user_command({
            type: 'TapTempo',
          })
        }
      >
        <AdjustIcon />
      </IconButton>
    </ButtonMidiOverlay>
  )
}
