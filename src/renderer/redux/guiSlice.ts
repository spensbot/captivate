import type { Page } from '../../shared/pages'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SaveInfo } from '../../shared/save'
import {
  MidiConnections,
  DmxConnectionInfo,
  initDmxConnections,
  initMidiConnections,
} from '../../shared/connection'

export type { Page }

export interface MoverCalibrationOverride {
  fixtureId: string
  panDmx: number
  tiltDmx: number
}

export interface ColorMapCalibrationOverride {
  fixtureTypeId: string
  channelIndex: number
  dmxValue: number
}

export interface GuiState {
  activePage: Page
  blackout: boolean
  connectionMenu: boolean
  midi: MidiConnections
  dmx: DmxConnectionInfo
  saving: boolean
  loading: SaveInfo | null
  newProjectDialog: boolean
  ledEnabled: boolean
  videoEnabled: boolean
  moverCalibrationOverride: MoverCalibrationOverride | null
  colorMapCalibrationOverride: ColorMapCalibrationOverride | null
}

export function initGuiState(): GuiState {
  return {
    activePage: 'Universe',
    blackout: false,
    connectionMenu: false,
    midi: initMidiConnections(),
    dmx: initDmxConnections(),
    saving: false,
    loading: null,
    newProjectDialog: false,
    ledEnabled: false,
    videoEnabled: false,
    moverCalibrationOverride: null,
    colorMapCalibrationOverride: null,
  }
}

export const guiSlice = createSlice({
  name: 'gui',
  initialState: initGuiState(),
  reducers: {
    setActivePage: (state, { payload }: PayloadAction<Page>) => {
      state.activePage = payload
    },
    setBlackout: (state, { payload }: PayloadAction<boolean>) => {
      state.blackout = payload
    },
    setConnectionsMenu: (state, { payload }: PayloadAction<boolean>) => {
      state.connectionMenu = payload
    },
    setMidi: (state, { payload }: PayloadAction<MidiConnections>) => {
      state.midi = payload
    },
    setDmx: (state, { payload }: PayloadAction<DmxConnectionInfo>) => {
      state.dmx = payload
    },
    setSaving: (state, { payload }: PayloadAction<boolean>) => {
      state.saving = payload
    },
    setLoading: (state, { payload }: PayloadAction<SaveInfo | null>) => {
      state.loading = payload
    },
    setNewProjectDialog: (state, { payload }: PayloadAction<boolean>) => {
      state.newProjectDialog = payload
    },
    toggleLedEnabled: (state, _: PayloadAction<undefined>) => {
      state.ledEnabled = !state.ledEnabled
    },
    toggleVideoEnabled: (state, _: PayloadAction<undefined>) => {
      state.videoEnabled = !state.videoEnabled
    },
    setMoverCalibrationOverride: (
      state,
      { payload }: PayloadAction<MoverCalibrationOverride>
    ) => {
      state.moverCalibrationOverride = payload
    },
    clearMoverCalibrationOverride: (state, _: PayloadAction<undefined>) => {
      state.moverCalibrationOverride = null
    },
    setColorMapCalibrationOverride: (
      state,
      { payload }: PayloadAction<ColorMapCalibrationOverride>
    ) => {
      state.colorMapCalibrationOverride = payload
    },
    clearColorMapCalibrationOverride: (state, _: PayloadAction<undefined>) => {
      state.colorMapCalibrationOverride = null
    },
  },
})

export const {
  setActivePage,
  setBlackout,
  setConnectionsMenu,
  setMidi,
  setDmx,
  setSaving,
  setLoading,
  setNewProjectDialog,
  toggleLedEnabled,
  toggleVideoEnabled,
  setMoverCalibrationOverride,
  clearMoverCalibrationOverride,
  setColorMapCalibrationOverride,
  clearColorMapCalibrationOverride,
} = guiSlice.actions

export default guiSlice.reducer


