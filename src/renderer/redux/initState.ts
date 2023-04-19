import { initDmxState } from 'features/fixtures/redux/fixturesSlice'
import { initGuiState } from 'features/ui/redux/guiSlice'
import { initControlState } from 'renderer/redux/controlSlice'
import { initMixerState } from 'features/dmx/redux/mixerSlice'
import { CleanReduxState } from './store'

export default function initState(): CleanReduxState {
  return {
    dmx: initDmxState(),
    gui: initGuiState(),
    control: initControlState(),
    mixer: initMixerState(),
  }
}
