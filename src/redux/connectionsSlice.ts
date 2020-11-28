import { createSlice } from '@reduxjs/toolkit';

export const connectionsSlice = createSlice({
  name: 'connections',
  initialState: {
    dmx: {
      isConnected: false,
      path: null
    },
    midi: {
      isConnected: false,
      path: null
    }
  },
  reducers: {
    setDmx: (state, action) => {
      state.dmx = action.payload
    },
    setMidi: (state, action) => {
      state.midi = action.payload
    }
  },
});

export const { setDmx, setMidi } = connectionsSlice.actions;

export default connectionsSlice.reducer;