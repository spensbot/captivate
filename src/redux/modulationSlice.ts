import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Payload {
  
}

export const modulationSlice = createSlice({
  name: 'modulation',
  initialState: {
    bpm: 90.0, // (from LINK)
    beats: 0.0, // running total of beats (from LINK)
    phase: 0.0, // from 0.0 to quantum (from LINK)
    quantum: 4.0,
    dt: 0.0,
  },
  reducers: {
    updateTime: (state, action: PayloadAction<UpdateTimePayload>) => {
      state.bpm = action.payload.bpm;
      state.beats = action.payload.beats;
      state.phase = action.payload.phase;
      state.quantum = action.payload.quantum;
      state.dt = action.payload.dt;
    },
  },
});

export const { updateTime } = modulationSlice.actions;

export default modulationSlice.reducer;
