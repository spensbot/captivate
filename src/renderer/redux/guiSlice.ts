import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  MidiConnections,
  DmxConnections,
  initDmxConnections,
  initMidiConnections,
} from '../../shared/connection'

export type Page = 'Universe' | 'Modulation' | 'Video' | 'Share' | 'Mixer'

export interface GuiState {
  activePage: Page
  blackout: boolean
  connectionMenu: boolean
  midi: MidiConnections
  dmx: DmxConnections
}

export function initGuiState(): GuiState {
  return {
    activePage: 'Universe',
    blackout: false,
    connectionMenu: false,
    midi: initMidiConnections(),
    dmx: initDmxConnections(),
  }
}

export const guiSlice = createSlice({
  name: 'gui',
  initialState: initGuiState(),
  reducers: {
    setActivePage: (state, { payload }: PayloadAction<Page>) => {
      state.activePage = payload
    },
    setBlackout: (state, { payload }: PayloadAction<boolean>) => {
      state.blackout = payload
    },
    setConnectionsMenu: (state, { payload }: PayloadAction<boolean>) => {
      state.connectionMenu = payload
    },
    setMidi: (state, { payload }: PayloadAction<MidiConnections>) => {
      state.midi = payload
    },
    setDmx: (state, { payload }: PayloadAction<DmxConnections>) => {
      state.dmx = payload
    },
  },
})

export const {
  setActivePage,
  setBlackout,
  setConnectionsMenu,
  setMidi,
  setDmx,
} = guiSlice.actions

export default guiSlice.reducer
