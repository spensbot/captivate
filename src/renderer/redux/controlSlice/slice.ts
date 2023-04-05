import { createSlice } from '@reduxjs/toolkit'

import { DeviceState, initDeviceState, midiActions } from 'features/midi/redux'
import {
  initScenesState,
  initLightScene,
  initVisualScene,
} from '../../../features/scenes/shared/Scenes'
import { ActionState, actions } from './reducers/actions'

export interface ControlState extends ActionState {
  device: DeviceState
}
export function initControlState(): ControlState {
  return {
    light: initScenesState(initLightScene()),
    visual: initScenesState(initVisualScene()),
    device: initDeviceState(),
    master: 1,
  }
}

export const scenesSlice = createSlice({
  name: 'scenes',
  initialState: initControlState(),
  reducers: {
    ...actions,

    // =====================   MIDI   ===========================================
    midiListen: (state, action) => midiActions.listen(state.device, action),
    midiStopListening: (state) => midiActions.stopListening(state.device),
    midiSetButtonAction: (state, action) =>
      midiActions.setButtonAction(state.device, action),
    midiSetIsEditing: (state, action) =>
      midiActions.setIsEditing(state.device, action),
    midiSetSliderAction: (state, action) =>
      midiActions.setSliderAction(state.device, action),
    setDmxConnectable: (state, action) =>
      midiActions.setDmxConnectable(state.device, action),
    setMidiConnectable: (state, action) =>
      midiActions.setMidiConnectable(state.device, action),
    removeMidiAction: (state, action) =>
      midiActions.removeMidiAction(state.device, action),
  },
})
