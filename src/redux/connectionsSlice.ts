import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { string, number, union, object, boolean, array } from '../util/validate'

type ConnectionStatus = {
  isConnected?: boolean
  path?: string
  isTroubleshoot?: boolean
}

type ConnectionsState = {
  dmx: ConnectionStatus
  midi: ConnectionStatus
}

const connectionStatusSchema = object<ConnectionStatus>({
  isConnected: boolean(),
  path: string(),
  isTroubleshoot: boolean()
})

export const connectionsSchema = object<ConnectionsState>({
  dmx: connectionStatusSchema,
  midi: connectionStatusSchema
})

export function initConnectionsState(): ConnectionsState {
  return {
    dmx: {},
    midi: {}
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
    } 
  },
});

export const { setDmx, setMidi } = connectionsSlice.actions;

export default connectionsSlice.reducer;