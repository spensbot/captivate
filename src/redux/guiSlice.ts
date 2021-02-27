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
    activePage: Page.UNIVERSE
  },
  reducers: {
    setActivePage: (state,{payload}: PayloadAction<Page>) => {
      state.activePage = payload
    }
  },
});

export const { setActivePage } = guiSlice.actions;

export default guiSlice.reducer;