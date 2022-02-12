import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ConnectionStatus, initConnectionStatus } from '../../shared/connection'

export type Page = 'Universe' | 'Modulation' | 'Video' | 'Share' | 'Mixer'

export interface GuiState {
  activePage: Page
  blackout: boolean
  connectionMenu: boolean
  midi: ConnectionStatus
  dmx: ConnectionStatus
}

export function initGuiState(): GuiState {
  return {
    activePage: 'Universe',
    blackout: false,
    connectionMenu: false,
    midi: initConnectionStatus(),
    dmx: initConnectionStatus(),
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
    setMidi: (state, { payload }: PayloadAction<ConnectionStatus>) => {
      state.midi = payload
    },
    setDmx: (state, { payload }: PayloadAction<ConnectionStatus>) => {
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
