import { createSlice } from '@reduxjs/toolkit';

export const connectionSlice = createSlice({
  name: 'connection',
  initialState: {
    dmx: {
      connected: false,
      path: null
    },
    midi: {
      connected: false,
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

export const { setDmx, setMidi } = connectionSlice.actions;

export default connectionSlice.reducer;