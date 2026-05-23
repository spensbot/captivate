import {
  configureStore,
  combineReducers,
  Reducer,
  PayloadAction,
} from '@reduxjs/toolkit'
import { useSelector, TypedUseSelectorHook } from 'react-redux'
import dmxReducer, { DmxState } from './dmxSlice'
import guiReducer, { GuiState } from './guiSlice'
import laserReducer from './laserSlice'
import controlReducer, { ControlState } from './controlSlice'
import { LightScene_t, VisualScene_t, SceneType, initLightScene } from '../../shared/Scenes'
import mixerReducer, { initMixerState } from './mixerSlice'
import undoable, { StateWithHistory } from 'redux-undo'
import { DeviceState, initDeviceState } from './deviceState'
import fixState, { fixDeviceState } from '../../shared/fixState'
import { DefaultParam, initBaseParams, Params } from '../../shared/params'
import { SaveInfo } from 'shared/save'
import { migrateLaserProjectState } from '../laser/laserProjectState'
import { FixtureType } from 'shared/dmxFixtures'

export interface UndoActionTypes {
  undo: string
  redo: string
}

export type UndoGroup = 'dmx' | 'control'

export const undoActionTypes: { [key in UndoGroup]: UndoActionTypes } = {
  dmx: {
    undo: 'DMX_UNDO',
    redo: 'DMX_REDO',
  },
  control: {
    undo: 'CONTROL_UNDO',
    redo: 'CONTROL_REDO',
  },
} as const

/** Detached popouts should follow main-window mapping mode, not keep stale local flags. */
function shouldPreserveLocalDeviceLearnState(): boolean {
  if (typeof window === 'undefined') {
    return true
  }
  const page = new URLSearchParams(window.location.search).get('page')
  return page !== 'Video' && page !== 'VideoViewport' && page !== 'Streaming'
}

const baseReducer = combineReducers({
  dmx: undoable(dmxReducer, {
    undoType: undoActionTypes.dmx.undo,
    redoType: undoActionTypes.dmx.redo,
  }),
  gui: guiReducer,
  control: undoable(controlReducer, {
    undoType: undoActionTypes.control.undo,
    redoType: undoActionTypes.control.redo,
  }),
  mixer: mixerReducer,
  laser: laserReducer,
})

export type ReduxState = ReturnType<typeof baseReducer>

const APPLY_SAVE = 'apply-save'
const RESET_STATE = 'reset-state'
const RESET_REMOTE_STATE = 'reset-remote-state'
const RESET_UNIVERSE = 'reset-universe'
const RESET_CONTROL = 'reset-control'
export function applySave(info: SaveInfo): PayloadAction<SaveInfo> {
  return {
    type: APPLY_SAVE,
    payload: info,
  }
}

export function resetState(
  newState: CleanReduxState
): PayloadAction<CleanReduxState> {
  return {
    type: RESET_STATE,
    payload: newState,
  }
}

export function resetRemoteState(
  newState: CleanReduxState
): PayloadAction<CleanReduxState> {
  return {
    type: RESET_REMOTE_STATE,
    payload: newState,
  }
}
export function resetUniverse(newDmxState: DmxState): PayloadAction<DmxState> {
  return {
    type: RESET_UNIVERSE,
    payload: newDmxState,
  }
}
export function resetControl(
  newControlState: ControlState
): PayloadAction<ControlState> {
  return {
    type: RESET_CONTROL,
    payload: newControlState,
  }
}

function sanitizeGuiTransientState(gui: GuiState): GuiState {
  return {
    ...gui,
    connectionMenu: false,
    saving: false,
    loading: null,
    newProjectDialog: false,
    moverCalibrationOverride: null,
    colorMapCalibrationOverride: null,
    statusMessages: [],
    statusLogOpen: false,
    appDialog: null,
    aboutOpen: false,
    atmosManualTriggerNonceByFixtureId: {},
  }
}

function initUndoState<State>(present: State): StateWithHistory<State> {
  return {
    past: [],
    present: present,
    future: [],
  }
}

const rootReducer: Reducer<ReduxState, PayloadAction<any>> = (
  state,
  action
) => {
  if (state === undefined) return baseReducer(state, action)
  if (action.type === RESET_STATE) {
    const cleanState: CleanReduxState = action.payload
    fixState(cleanState)
    return {
      dmx: initUndoState(cleanState.dmx),
      gui: sanitizeGuiTransientState(cleanState.gui),
      control: initUndoState(cleanState.control),
      mixer: cleanState.mixer,
      laser: cleanState.laser,
    }
  } else if (action.type === RESET_REMOTE_STATE) {
    const cleanState: CleanReduxState = action.payload
    fixState(cleanState)
    const localDevice = state.control.present.device
    if (
      shouldPreserveLocalDeviceLearnState() &&
      (localDevice.keyboardListening !== undefined ||
        localDevice.listening !== undefined ||
        localDevice.keyboardLearnMode === true ||
        localDevice.isEditing === true)
    ) {
      cleanState.control.device = {
        ...cleanState.control.device,
        keyboardListening: localDevice.keyboardListening,
        listening: localDevice.listening,
        keyboardLearnMode: localDevice.keyboardLearnMode,
        isEditing: localDevice.isEditing,
      }
    }
    const localGui = state.gui
    return {
      dmx: initUndoState(cleanState.dmx),
      gui: {
        ...sanitizeGuiTransientState(cleanState.gui),
        // Connection lists are owned by the main process (IPC), not peer renderers.
        dmx: localGui.dmx,
        midi: localGui.midi,
        activePage: localGui.activePage,
        connectionMenu: localGui.connectionMenu,
        saving: localGui.saving,
        loading: localGui.loading,
        newProjectDialog: localGui.newProjectDialog,
        moverCalibrationOverride: localGui.moverCalibrationOverride,
        colorMapCalibrationOverride: localGui.colorMapCalibrationOverride,
        statusLogOpen: localGui.statusLogOpen,
        appDialog: localGui.appDialog,
        aboutOpen: localGui.aboutOpen,
        atmosManualTriggerNonceByFixtureId: {},
      },
      control: initUndoState(cleanState.control),
      mixer: cleanState.mixer,
      laser: cleanState.laser,
    }
  } else if (action.type === RESET_UNIVERSE) {
    const us: DmxState = action.payload
    return {
      ...state,
      dmx: {
        ...state.dmx,
        present: us,
      },
    }
  } else if (action.type === RESET_CONTROL) {
    const cs: ControlState = action.payload
    fixDeviceState(cs.device)
    return {
      ...state,
      control: initUndoState(cs),
    }
  } else if (action.type === APPLY_SAVE) {
    const info: SaveInfo = action.payload
    const control = state.control.present
    const loadedGuiRaw =
      info.config.gui && info.state.gui
        ? {
            ...state.gui,
            ...info.state.gui,
            activePage:
              info.state.gui.activePage === 'Streaming'
                ? 'Video'
                : (info.state.gui.activePage ?? state.gui.activePage),
            saving: false,
            loading: null,
            connectionMenu: false,
            newProjectDialog: false,
            moverCalibrationOverride: null,
            colorMapCalibrationOverride: null,
            statusLogOpen: false,
            appDialog: null,
            aboutOpen: false,
          }
        : state.gui
    const loadedGui =
      loadedGuiRaw !== state.gui &&
      loadedGuiRaw.activePage === 'Led' &&
      loadedGuiRaw.ledSidebarEnabled !== true
        ? { ...loadedGuiRaw, activePage: 'Universe' as const }
        : loadedGuiRaw
    const nextDevice =
      info.config.device && info.state.device
        ? info.state.device
        : control.device
    fixDeviceState(nextDevice)
    return {
      ...state,
      dmx: {
        ...state.dmx,
        present:
          info.config.dmx && info.state.dmx
            ? info.state.dmx
            : state.dmx.present,
      },
      control: {
        ...state.control,
        present: {
          ...state.control.present,
          device: nextDevice,
          light:
            info.config.light && info.state.light
              ? info.state.light
              : control.light,
          visual:
            info.config.visual && info.state.visual
              ? info.state.visual
              : control.visual,
        },
      },
      gui: loadedGui,
      mixer:
        info.config.mixer && info.state.mixer
          ? { ...initMixerState(), ...info.state.mixer }
          : state.mixer,
      laser:
        info.config.laser && info.state.laser
          ? migrateLaserProjectState(info.state.laser)
          : state.laser,
    }
    // I HAVE NO IDEA WHY THE BELOW APPROACH DOESN"T WORK IF ANYBODY KNOWS PLEASE TELL ME!!!
    // let newState = {
    //   ...state,
    // }
    // if (info.config.device && info.state.device) {
    //   newState.control.present.device = info.state.device
    // }
    // if (info.config.dmx && info.state.dmx) {
    //   newState.dmx.present = info.state.dmx
    // }
    // if (info.config.light && info.state.light) {
    //   newState.control.present.light = info.state.light
    // }
    // if (info.config.visual && info.state.visual) {
    //   newState.control.present.visual = info.state.visual
    // }
    // return newState
  }
  return baseReducer(state, action)
}

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
  devTools: { name: 'UI Store' },
})

export type ReduxStore = typeof store
export type ReduxDispatch = typeof store.dispatch
export const useTypedSelector: TypedUseSelectorHook<ReduxState> = useSelector

export function getCleanReduxState(state: ReduxState) {
  return {
    dmx: state.dmx.present,
    gui: sanitizeGuiTransientState(state.gui),
    control: state.control.present,
    mixer: state.mixer,
    laser: state.laser,
  }
}

export type CleanReduxState = ReturnType<typeof getCleanReduxState>

export function useControlSelector<T>(getVal: (scenes: ControlState) => T) {
  return useTypedSelector((state) => getVal(state.control.present))
}

export function useActiveScene<T>(
  sceneType: SceneType,
  getVal: (scene: LightScene_t | VisualScene_t) => T
) {
  return useTypedSelector((state) =>
    getVal(
      state.control.present[sceneType].byId[
        state.control.present[sceneType].active
      ]
    )
  )
}

export function useActiveLightScene<T>(getVal: (scene: LightScene_t) => T) {
  return useTypedSelector((state) => {
    const scene =
      state.control.present.light.byId[state.control.present.light.active]
    if (scene === undefined) {
      return getVal(initLightScene())
    }
    return getVal(scene)
  })
}

export function useActiveVisualScene<T>(getVal: (scene: VisualScene_t) => T) {
  return useTypedSelector((state) =>
    getVal(
      state.control.present.visual.byId[state.control.present.visual.active]
    )
  )
}

export function useDmxSelector<T>(getVal: (dmx: DmxState) => T) {
  return useTypedSelector((state) => getVal(state.dmx.present))
}

export function useActiveFixtureType<T>(
  getVal: (ft: FixtureType) => T | null
): T | null {
  return useDmxSelector((dmx) => {
    if (dmx.activeFixtureType === null) {
      return null
    } else {
      return getVal(dmx.fixtureTypesByID[dmx.activeFixtureType])
    }
  })
}

export function useDeviceSelector<T>(getVal: (midi: DeviceState) => T) {
  return useTypedSelector((state) => {
    const device = state.control.present.device
    if (!device) {
      return getVal(initDeviceState())
    }
    return getVal(device)
  })
}

export function useBaseParam(
  param: DefaultParam | string,
  splitIndex: number
): number | undefined {
  const baseParam = useActiveLightScene((state) => {
    return state.splitScenes[splitIndex]?.baseParams[param]
  })
  return baseParam
}

export function useBaseParams(splitIndex: number): Params {
  const baseParams = useActiveLightScene((state) => {
    return state.splitScenes[splitIndex]?.baseParams ?? initBaseParams()
  })
  return baseParams
}

export function useModParam(
  param: DefaultParam | string,
  modIndex: number,
  splitIndex: number
) {
  return useActiveLightScene((scene) => {
    const modulator = scene.modulators[modIndex]
    if (modulator === undefined) return undefined
    if (typeof param === 'string' && param.startsWith('intermod:lfo:')) {
      return modulator.lfoInterModulation?.[param]
    }
    return modulator.splitModulations?.[splitIndex]?.[param]
  })
}
