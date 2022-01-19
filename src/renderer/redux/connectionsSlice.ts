import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type ConnectionStatus = {
  isConnected?: boolean
  path?: string
  isTroubleshoot?: boolean
}

export type ConnectionsState = {
  dmx: ConnectionStatus
  midi: ConnectionStatus
}

export function initConnectionsState(): ConnectionsState {
  return {
    dmx: {},
    midi: {},
  }
}

export const connectionsSlice = createSlice({
  name: 'connections',
  initialState: initConnectionsState(),
  reducers: {
    setDmx: (state, action: PayloadAction<ConnectionStatus>) => {
      state.dmx = action.payload
    },
    setMidi: (state, action: PayloadAction<ConnectionStatus>) => {
      state.midi = action.payload
    },
  },
})

export const { setDmx, setMidi } = connectionsSlice.actions

export default connectionsSlice.reducer
