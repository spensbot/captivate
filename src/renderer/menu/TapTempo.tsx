import { send_user_command } from '../ipcHandler'
import { ButtonMidiOverlay } from 'renderer/base/MidiOverlay'
import { useControlSelector } from '../redux/store'
import { normalizeAudioInputSettings } from '../../shared/audioEngine'
import { StatusBarTapButton } from './statusBarUi'

export default function TapTempo() {
  const audioModeOn = useControlSelector(
    (state) =>
      normalizeAudioInputSettings(state.device.connectionSettings.audioInput)
        .enabled === true
  )
  const tapTitle = audioModeOn
    ? 'Tap beats — nudges audio BPM tracking'
    : 'Tap repeatedly to set master tempo'

  return (
    <ButtonMidiOverlay action={{ type: 'tapTempo' }}>
      <StatusBarTapButton
        type="button"
        title={tapTitle}
        onClick={() => send_user_command({ type: 'TapTempo' })}
      >
        Tap
      </StatusBarTapButton>
    </ButtonMidiOverlay>
  )
}
