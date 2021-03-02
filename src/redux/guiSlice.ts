import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export enum Page {
  UNIVERSE,
  MODULATION,
  VIDEO,
  SHARE
}

export const guiSlice = createSlice({
  name: 'gui',
  initialState: {
    activePage: Page.UNIVERSE,
    blackout: false
  },
  reducers: {
    setActivePage: (state,{payload}: PayloadAction<Page>) => {
      state.activePage = payload
    },
    setBlackout: (state, { payload }: PayloadAction<boolean>) => {
      state.blackout = payload
    }
  },
});

export const { setActivePage, setBlackout } = guiSlice.actions;

export default guiSlice.reducer;