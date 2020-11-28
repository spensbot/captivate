import { createSlice } from '@reduxjs/toolkit';

export const timeSlice = createSlice({
  name: 'time',
  initialState: {
    signature: {
      numerator: 4,
      denominator: 4,
      bars: 4,
    },
    bpm: 90,
    bar: 1,
    beat: 1,
    pos: 0.0,
    dt: 0.0,
  },
  reducers: {
    setTimeSig: (state, action) => {
      state.signature = action.payload.signature;
    },
    setBPM: (state, action) => {
      state.bpm = action.payload;
    },
    updateTime: (state, action) => {
      state.dt = action.payload; // seconds
      state.pos += state.dt / 1000 * state.bpm / 60;
      if (state.pos > 1.0) {
        state.pos -= 1.0;
        state.beat += 1;
        if (state.beat > state.signature.numerator) {
          state.beat = 1;
          state.bar += 1;
          if (state.bar > state.signature.bars) {
            state.bar = 1;
          }
        }
      }
    },
  },
});

export const { setTimeSig, setBPM, updateTime } = timeSlice.actions;

export default timeSlice.reducer;
