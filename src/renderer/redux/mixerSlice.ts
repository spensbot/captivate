import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { DMX_MAX_UNIVERSES, DMX_NUM_CHANNELS } from '../../shared/dmxFixtures'

export interface MixerState {
  pageIndex: number
  channelsPerPage: number
  activeUniverse: number
  overwritesByUniverse: { [universe: number]: number[] }
  /** When true, list all DMX channels; when false (default), only channels used by fixtures on the active universe. */
  showAllMixerChannels: boolean
}

export function initMixerState(): MixerState {
  return {
    pageIndex: 0,
    channelsPerPage: DMX_NUM_CHANNELS,
    activeUniverse: 1,
    overwritesByUniverse: {},
    showAllMixerChannels: false,
  }
}

function clampChannelsPerPage(value: number): number {
  if (!Number.isFinite(value)) return DMX_NUM_CHANNELS
  return Math.min(DMX_NUM_CHANNELS, Math.max(1, Math.round(value)))
}

function clampUniverse(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(DMX_MAX_UNIVERSES, Math.max(1, Math.round(value)))
}

function maxPageIndex(channelsPerPage: number): number {
  return Math.max(0, Math.ceil(DMX_NUM_CHANNELS / channelsPerPage) - 1)
}

export function getUniverseOverwrites(
  state: MixerState,
  universe: number
): number[] {
  return state.overwritesByUniverse[clampUniverse(universe)] ?? []
}

export const mixerSlice = createSlice({
  name: 'mixer',
  initialState: initMixerState(),
  reducers: {
    setPageIndex: (state, { payload }: PayloadAction<number>) => {
      const maxPage = maxPageIndex(state.channelsPerPage)
      state.pageIndex = Math.min(Math.max(0, payload), maxPage)
    },
    setChannelsPerPage: (state, { payload }: PayloadAction<number>) => {
      state.channelsPerPage = clampChannelsPerPage(payload)
      const maxPage = maxPageIndex(state.channelsPerPage)
      state.pageIndex = Math.min(state.pageIndex, maxPage)
    },
    setActiveMixerUniverse: (state, { payload }: PayloadAction<number>) => {
      state.activeUniverse = clampUniverse(payload)
    },
    setOverwrite: (
      state,
      {
        payload,
      }: PayloadAction<{ index: number; value: number; universe?: number }>
    ) => {
      const universe = clampUniverse(payload.universe ?? state.activeUniverse)
      if (state.overwritesByUniverse[universe] === undefined) {
        state.overwritesByUniverse[universe] = []
      }
      state.overwritesByUniverse[universe][payload.index] = payload.value
    },
    clearOverwrites: (state, { payload }: PayloadAction<number | undefined>) => {
      const universe = clampUniverse(payload ?? state.activeUniverse)
      state.overwritesByUniverse[universe] = []
    },
    setMixerShowAllChannels: (state, { payload }: PayloadAction<boolean>) => {
      state.showAllMixerChannels = payload
    },
  },
})

export const {
  setPageIndex,
  setChannelsPerPage,
  setActiveMixerUniverse,
  setOverwrite,
  clearOverwrites,
  setMixerShowAllChannels,
} = mixerSlice.actions

export default mixerSlice.reducer
