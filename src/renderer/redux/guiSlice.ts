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

export interface StatusMessage {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  source?: string
  ts: number
}

export interface AppDialogState {
  id: string
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
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
  moverFollowOverrideEnabled: boolean
  moverFollowOverridePan: number
  moverFollowOverrideTilt: number
  moverFollowOverrideUseAllGroups: boolean
  moverFollowOverrideGroups: string[]
  colorMapCalibrationOverride: ColorMapCalibrationOverride | null
  fxtrDepthOn: boolean
  /** When true, the left sidebar shows the LED editor page (off by default; Extras menu). */
  ledSidebarEnabled: boolean
  statusMessages: StatusMessage[]
  statusLogOpen: boolean
  appDialog: AppDialogState | null
  aboutOpen: boolean
  atmosManualTriggerNonceByFixtureId: { [fixtureId: string]: number | undefined }
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
    ledEnabled: true,
    videoEnabled: false,
    moverCalibrationOverride: null,
    moverFollowOverrideEnabled: false,
    moverFollowOverridePan: 0.5,
    moverFollowOverrideTilt: 0.5,
    moverFollowOverrideUseAllGroups: true,
    moverFollowOverrideGroups: [],
    colorMapCalibrationOverride: null,
    fxtrDepthOn: false,
    ledSidebarEnabled: false,
    statusMessages: [],
    statusLogOpen: false,
    appDialog: null,
    aboutOpen: false,
    atmosManualTriggerNonceByFixtureId: {},
  }
}

export const guiSlice = createSlice({
  name: 'gui',
  initialState: initGuiState(),
  reducers: {
    setActivePage: (state, { payload }: PayloadAction<Page>) => {
      state.activePage = payload === 'Streaming' ? 'Video' : payload
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
      state.ledEnabled = true
    },
    toggleVideoEnabled: (state, _: PayloadAction<undefined>) => {
      state.videoEnabled = !state.videoEnabled
    },
    setVideoEnabled: (state, { payload }: PayloadAction<boolean>) => {
      state.videoEnabled = payload === true
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
    setMoverFollowOverrideEnabled: (
      state,
      { payload }: PayloadAction<boolean>
    ) => {
      state.moverFollowOverrideEnabled = payload === true
    },
    toggleMoverFollowOverrideEnabled: (state, _: PayloadAction<undefined>) => {
      state.moverFollowOverrideEnabled = !state.moverFollowOverrideEnabled
    },
    setMoverFollowOverridePan: (
      state,
      { payload }: PayloadAction<number>
    ) => {
      const next = Number(payload)
      state.moverFollowOverridePan = Number.isFinite(next)
        ? Math.min(1, Math.max(0, next))
        : 0.5
    },
    setMoverFollowOverrideTilt: (
      state,
      { payload }: PayloadAction<number>
    ) => {
      const next = Number(payload)
      state.moverFollowOverrideTilt = Number.isFinite(next)
        ? Math.min(1, Math.max(0, next))
        : 0.5
    },
    setMoverFollowOverrideUseAllGroups: (
      state,
      { payload }: PayloadAction<boolean>
    ) => {
      state.moverFollowOverrideUseAllGroups = payload === true
    },
    setMoverFollowOverrideGroups: (
      state,
      { payload }: PayloadAction<string[]>
    ) => {
      const next = Array.isArray(payload)
        ? payload
            .map((group) => (typeof group === 'string' ? group.trim() : ''))
            .filter((group) => group.length > 0)
        : []
      state.moverFollowOverrideGroups = Array.from(new Set(next))
    },
    toggleMoverFollowOverrideGroup: (
      state,
      { payload }: PayloadAction<string>
    ) => {
      const groupName =
        typeof payload === 'string' ? payload.trim() : ''
      if (groupName.length <= 0) {
        return
      }

      const current = new Set(state.moverFollowOverrideGroups)
      if (current.has(groupName)) {
        current.delete(groupName)
      } else {
        current.add(groupName)
      }
      state.moverFollowOverrideGroups = Array.from(current)
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
    setFxtrDepthOn: (
      state,
      { payload }: PayloadAction<boolean>
    ) => {
      state.fxtrDepthOn = payload === true
    },
    setLedSidebarEnabled: (state, { payload }: PayloadAction<boolean>) => {
      const on = payload === true
      state.ledSidebarEnabled = on
      if (!on && state.activePage === 'Led') {
        state.activePage = 'Universe'
      }
    },
    pushStatusMessage: (
      state,
      {
        payload,
      }: PayloadAction<{
        level: 'info' | 'warn' | 'error'
        message: string
        source?: string
      }>
    ) => {
      const nextMessage = payload.message.trim()
      if (nextMessage.length <= 0) {
        return
      }
      const now = Date.now()
      const latest = state.statusMessages[state.statusMessages.length - 1]
      if (
        latest !== undefined &&
        latest.level === payload.level &&
        latest.message === nextMessage &&
        now - latest.ts < 1500
      ) {
        latest.ts = now
        return
      }
      state.statusMessages.push({
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        level: payload.level,
        message: nextMessage,
        source: payload.source,
        ts: now,
      })
      if (state.statusMessages.length > 150) {
        state.statusMessages.splice(0, state.statusMessages.length - 150)
      }
    },
    clearStatusMessages: (state, _: PayloadAction<undefined>) => {
      state.statusMessages = []
    },
    setStatusLogOpen: (state, { payload }: PayloadAction<boolean>) => {
      state.statusLogOpen = payload === true
    },
    showAppDialog: (state, { payload }: PayloadAction<AppDialogState>) => {
      state.appDialog = payload
    },
    hideAppDialog: (state, _: PayloadAction<undefined>) => {
      state.appDialog = null
    },
    setAboutOpen: (state, { payload }: PayloadAction<boolean>) => {
      state.aboutOpen = payload === true
    },
    fireAtmosManualTrigger: (state, { payload }: PayloadAction<string>) => {
      const fixtureId = typeof payload === 'string' ? payload.trim() : ''
      if (fixtureId.length <= 0) {
        return
      }
      const current = state.atmosManualTriggerNonceByFixtureId[fixtureId] ?? 0
      state.atmosManualTriggerNonceByFixtureId[fixtureId] = current + 1
    },
    clearAtmosManualTriggers: (state, _: PayloadAction<undefined>) => {
      state.atmosManualTriggerNonceByFixtureId = {}
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
  setVideoEnabled,
  setMoverCalibrationOverride,
  clearMoverCalibrationOverride,
  setMoverFollowOverrideEnabled,
  toggleMoverFollowOverrideEnabled,
  setMoverFollowOverridePan,
  setMoverFollowOverrideTilt,
  setMoverFollowOverrideUseAllGroups,
  setMoverFollowOverrideGroups,
  toggleMoverFollowOverrideGroup,
  setColorMapCalibrationOverride,
  clearColorMapCalibrationOverride,
  setFxtrDepthOn,
  setLedSidebarEnabled,
  pushStatusMessage,
  clearStatusMessages,
  setStatusLogOpen,
  showAppDialog,
  hideAppDialog,
  setAboutOpen,
  fireAtmosManualTrigger,
  clearAtmosManualTriggers,
} = guiSlice.actions

export default guiSlice.reducer


