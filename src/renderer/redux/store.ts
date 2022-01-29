import {
  configureStore,
  combineReducers,
  Reducer,
  PayloadAction,
} from '@reduxjs/toolkit'
import connectionsReducer from './connectionsSlice'
import { useSelector, TypedUseSelectorHook } from 'react-redux'
import dmxReducer, { DmxState } from './dmxSlice'
import guiReducer from './guiSlice'
import controlReducer, {
  ControlState,
  VisualScene_t,
  SceneType,
} from './controlSlice'
import { LightScene_t } from '../../engine/LightScene'
import mixerReducer from './mixerSlice'
import undoable, { StateWithHistory } from 'redux-undo'
import { MidiState } from './midiState'

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
  connections: connectionsReducer,
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

const RESET_STATE = 'reset-state'
const RESET_UNIVERSE = 'reset-universe'
const RESET_CONTROL = 'reset-control'
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
      connections: cleanState.connections,
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
})

export type ReduxStore = typeof store
export type ReduxDispatch = typeof store.dispatch
export const useTypedSelector: TypedUseSelectorHook<ReduxState> = useSelector

export function getCleanReduxState(state: ReduxState) {
  return {
    connections: state.connections,
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

export function useMidiSelector<T>(getVal: (midi: MidiState) => T) {
  return useTypedSelector((state) => getVal(state.control.present.midi))
}
