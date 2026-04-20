import { send_user_command } from '../ipcHandler'
import { ButtonMidiOverlay } from 'renderer/base/MidiOverlay'
import styled from 'styled-components'
import { useControlSelector } from '../redux/store'
import { normalizeAudioInputSettings } from '../../shared/audioEngine'

interface Props {}

export default function TapTempo({}: Props) {
  const audioModeOn = useControlSelector(
    (state) =>
      normalizeAudioInputSettings(state.device.connectionSettings.audioInput)
        .enabled === true
  )
  const tapTitle = audioModeOn
    ? 'Tap the beat: sends a decaying hint to audio BPM detection. Master tempo still follows taps when Audio Beat Clock and MIDI clock tempo are off.'
    : 'Tap repeatedly to set tempo'

  return (
    <ButtonMidiOverlay
      action={{
        type: 'tapTempo',
      }}
    >
      <Button
        title={tapTitle}
        onClick={() => send_user_command({ type: 'TapTempo' })}
      >
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
