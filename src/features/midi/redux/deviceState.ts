import { PayloadAction } from '@reduxjs/toolkit'
import { getActionID } from './actions'

import { ConnectionId } from '../../devices/shared/connection'
import { MidiActions } from '../shared/actions'

interface Range {
  min: number
  max: number
}
interface SliderControl_cc extends Range {
  type: 'cc'
  mode: 'absolute' | 'relative'
}
interface SliderControl_note extends Range {
  type: 'note'
  value: 'velocity' | 'max'
  mode: 'toggle' | 'hold'
}
export type SliderControlOptions = SliderControl_cc | SliderControl_note

export interface ButtonAction {
  inputID: string
  action: MidiActions
}
export interface SliderAction extends ButtonAction {
  options: SliderControlOptions
}

// ActionID = setAutoSceneBombacity, setActiveSceneIndex0, etc.
// InputID = note70, cc50, etc.
export interface DeviceState {
  listening?: MidiActions
  isEditing: boolean
  connectable: {
    midi: ConnectionId[]
    dmx: ConnectionId[]
  }
  buttonActions: { [actionID: string]: ButtonAction }
  sliderActions: { [actionID: string]: SliderAction }
}

export function initDeviceState(): DeviceState {
  return {
    isEditing: false,
    buttonActions: {},
    sliderActions: {},
    connectable: {
      midi: [],
      dmx: [],
    },
  }
}

export const midiActions = {
  setButtonAction: (
    state: DeviceState,
    { payload }: PayloadAction<{ inputID: string; action: MidiActions }>
  ) => {
    clearInputID(state, payload.inputID)
    state.buttonActions[getActionID(payload.action)] = payload
  },
  setSliderAction: (
    state: DeviceState,
    {
      payload,
    }: PayloadAction<{
      inputID: string
      action: MidiActions
      options: SliderControlOptions
    }>
  ) => {
    clearInputID(state, payload.inputID)
    state.sliderActions[getActionID(payload.action)] = payload
  },
  removeMidiAction: (
    state: DeviceState,
    { payload }: PayloadAction<MidiActions>
  ) => {
    const actionId = getActionID(payload)
    delete state.buttonActions[actionId]
    delete state.sliderActions[actionId]
  },
  listen: (state: DeviceState, { payload }: PayloadAction<MidiActions>) => {
    state.listening = payload
  },
  stopListening: (state: DeviceState) => {
    delete state.listening
  },
  setIsEditing: (state: DeviceState, { payload }: PayloadAction<boolean>) => {
    delete state.listening
    state.isEditing = payload
  },
  setMidiConnectable: (
    state: DeviceState,
    { payload }: PayloadAction<ConnectionId[]>
  ) => {
    state.connectable.midi = payload
  },
  setDmxConnectable: (
    state: DeviceState,
    { payload }: PayloadAction<ConnectionId[]>
  ) => {
    state.connectable.dmx = payload
  },
}

function clearInputID(state: DeviceState, inputID: string) {
  for (let [actionID, buttonAction] of Object.entries(state.buttonActions)) {
    if (buttonAction.inputID === inputID) delete state.buttonActions[actionID]
  }
  for (let [actionID, sliderAction] of Object.entries(state.sliderActions)) {
    if (sliderAction.inputID === inputID) delete state.sliderActions[actionID]
  }
}
