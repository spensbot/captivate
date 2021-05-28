import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Page = 'Universe' | 'Modulation' | 'Video' | 'Share' | 'Mixer'

export interface GuiState {
  activePage: Page,
  blackout: boolean,
  videos: string[],
  text: string[]
}

const initState: GuiState = {
  activePage: 'Universe',
  blackout: false,
  videos: [ "" ],
  text: [ "feel with me", "Sailing To Mars" ]
}

export const guiSlice = createSlice({
  name: 'gui',
  initialState: initState,
  reducers: {
    setActivePage: (state,{payload}: PayloadAction<Page>) => {
      state.activePage = payload
    },
    addVideos: (state,{payload}: PayloadAction<string[]>) => {
      state.videos.push(...payload)
    },
    addText: (state,{payload}: PayloadAction<string[]>) => {
      state.text.push(...payload)
    },
    setBlackout: (state, { payload }: PayloadAction<boolean>) => {
      state.blackout = payload
    }
  },
});

export const { setActivePage, setBlackout, addVideos, addText } = guiSlice.actions;

export default guiSlice.reducer;