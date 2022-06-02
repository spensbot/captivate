import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface MixerState {
  pageIndex: number
  channelsPerPage: number
  overwrites: number[]
}

export function initMixerState(): MixerState {
  return {
    pageIndex: 0,
    channelsPerPage: 100,
    overwrites: []
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
    setOverwrite: (state, { payload }: PayloadAction<{ index: number, value: number }>) => {
      state.overwrites[payload.index] = payload.value
    },
    clearOverwrites: (state, {payload}: PayloadAction<undefined>) => {
      state.overwrites = []
    }
  },
});

export const { setPageIndex, setChannelsPerPage, setOverwrite, clearOverwrites } = guiSlice.actions;

export default guiSlice.reducer;