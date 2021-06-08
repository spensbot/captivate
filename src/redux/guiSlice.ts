import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { string, number, union, object, boolean, array } from '../util/validate'

export type Page = 'Universe' | 'Modulation' | 'Video' | 'Share' | 'Mixer'

export interface GuiState {
  activePage: Page,
  blackout: boolean,
  videos: string[],
  text: string[]
}

export const guiStateShema = object<GuiState>({
  activePage: union('Universe', 'Modulation', 'Video', 'Share', 'Mixer'),
  blackout: boolean(),
  videos: array(string()),
  text: array(string())
})

export function initGuiState(): GuiState {
  return {
    activePage: 'Universe',
    blackout: false,
    videos: [ "" ],
    text: [ "feel with me", "Sailing To Mars" ]
  }
}

export const guiSlice = createSlice({
  name: 'gui',
  initialState: initGuiState(),
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