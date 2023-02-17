import {
  configureStore,
  combineReducers,
  Reducer,
  PayloadAction,
} from '@reduxjs/toolkit'
import { useSelector, TypedUseSelectorHook } from 'react-redux'
import dmxReducer, { DmxState } from './dmxSlice'
import guiReducer from './guiSlice'
import controlReducer, { ControlState } from './controlSlice'
import { LightScene_t } from '../../shared/Scenes'
import mixerReducer from './mixerSlice'
import undoable, { StateWithHistory } from 'redux-undo'
import { DeviceState } from './deviceState'
import { VisualScene_t, SceneType } from '../../shared/Scenes'
import { DefaultParam, Params } from '../../shared/params'
import { SaveInfo } from 'shared/save'
import eventLogger from './eventLogger'

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
})

export type ReduxState = ReturnType<typeof baseReducer>

const APPLY_SAVE = 'apply-save'
const RESET_STATE = 'reset-state'
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
    return {
      dmx: initUndoState(cleanState.dmx),
      gui: cleanState.gui,
      control: initUndoState(cleanState.control),
      mixer: cleanState.mixer,
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
    return {
      ...state,
      control: initUndoState(cs),
    }
  } else if (action.type === APPLY_SAVE) {
    const info: SaveInfo = action.payload
    const control = state.control.present
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
          device:
            info.config.device && info.state.device
              ? info.state.device
              : control.device,
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
    }).concat(eventLogger),
  devTools: { name: 'UI Store' },
})

export type ReduxStore = typeof store
export type ReduxDispatch = typeof store.dispatch
export const useTypedSelector: TypedUseSelectorHook<ReduxState> = useSelector

export function getCleanReduxState(state: ReduxState) {
  return {
    dmx: state.dmx.present,
    gui: state.gui,
    control: state.control.present,
    mixer: state.mixer,
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
  return useTypedSelector((state) =>
    getVal(state.control.present.light.byId[state.control.present.light.active])
  )
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

export function useDeviceSelector<T>(getVal: (midi: DeviceState) => T) {
  return useTypedSelector((state) => getVal(state.control.present.device))
}

export function useBaseParam(
  param: DefaultParam | string,
  splitIndex: number
): number | undefined {
  const baseParam = useActiveLightScene((state) => {
    return state.splitScenes[splitIndex].baseParams[param]
  })
  return baseParam
}

export function useBaseParams(splitIndex: number): Params {
  const baseParams = useActiveLightScene((state) => {
    return state.splitScenes[splitIndex].baseParams
  })
  return baseParams
}

export function useModParam(
  param: DefaultParam | string,
  modIndex: number,
  splitIndex: number | null
) {
  return useActiveLightScene((scene) => {
    const modulator = scene.modulators[modIndex]
    if (splitIndex === null) {
      return modulator.modulation[param]
    } else {
      return modulator.splitModulations[splitIndex][param]
    }
  })
}
