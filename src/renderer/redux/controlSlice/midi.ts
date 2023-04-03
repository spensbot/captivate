import { scenesSlice } from './slice'

export const {
  // MIDI
  midiListen,
  midiStopListening,
  midiSetButtonAction,
  midiSetIsEditing,
  midiSetSliderAction,
  setDmxConnectable,
  setMidiConnectable,
  removeMidiAction,
} = scenesSlice.actions
