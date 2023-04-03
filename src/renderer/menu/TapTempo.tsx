import { send_user_command } from '../ipcHandler'
import { ButtonMidiOverlay } from 'features/midi/react/MidiOverlay'
import styled from 'styled-components'

interface Props {}

export default function TapTempo({}: Props) {
  return (
    <ButtonMidiOverlay
      action={{
        type: 'tapTempo',
      }}
    >
      <Button onClick={() => send_user_command({ type: 'TapTempo' })}>
        TAP
      </Button>
      {/* <IconButton
        onClick={() =>
          send_user_command({
            type: 'TapTempo',
          })
        }
      >
        <AdjustIcon />
      </IconButton> */}
    </ButtonMidiOverlay>
  )
}

const Button = styled.div`
  font-size: 0.9rem;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  border: 1px solid #fff2;
  border-radius: 3px;
  :hover {
    border-color: #fff6;
  }
  :active {
    background-color: #fff3;
  }
`
