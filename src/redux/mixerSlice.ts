import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface MixerState {
  pageIndex: number
  channelsPerPage: number
}

export function initMixerState(): MixerState {
  return {
    pageIndex: 0,
    channelsPerPage: 100
  }
}

export const guiSlice = createSlice({
  name: 'gui',
  initialState: initMixerState(),
  reducers: {
    setPageIndex: (state, {payload}: PayloadAction<number>) => {
      state.pageIndex = payload
    },
    setChannelsPerPage: (state, {payload}: PayloadAction<number>) => {
      state.channelsPerPage = payload
    },
  },
});

export const { setPageIndex, setChannelsPerPage } = guiSlice.actions;

export default guiSlice.reducer;