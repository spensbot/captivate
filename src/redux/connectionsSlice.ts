import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import ConnectionStatus from '../components/ConnectionStatus';

type ConnectionStatus = {
  isConnected?: boolean
  path?: string
  isTroubleshoot?: boolean
}

type InitialState = {
  dmx: ConnectionStatus
  midi: ConnectionStatus
}
const initialState: InitialState = {
  dmx: {},
  midi: {}
}

export const connectionsSlice = createSlice({
  name: 'connections',
  initialState: initialState,
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