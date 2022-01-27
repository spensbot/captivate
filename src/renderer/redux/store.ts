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
import midiReducer, { MidiState } from './midiSlice'
import mixerReducer from './mixerSlice'
import undoable, { StateWithHistory } from 'redux-undo'

export interface UndoActionTypes {
  undo: string
  redo: string
}

export type UndoGroup = 'dmx' | 'control' | 'midi'

export const undoActionTypes: { [key in UndoGroup]: UndoActionTypes } = {
  dmx: {
    undo: 'DMX_UNDO',
    redo: 'DMX_REDO',
  },
  control: {
    undo: 'CONTROL_UNDO',
    redo: 'CONTROL_REDO',
  },
  midi: {
    undo: 'MIDI_UNDO',
    redo: 'MIDI_REDO',
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
  midi: undoable(midiReducer, {
    undoType: undoActionTypes.midi.undo,
    redoType: undoActionTypes.midi.redo,
  }),
  mixer: mixerReducer,
})

export type ReduxState = ReturnType<typeof baseReducer>

const RESET_STATE = 'reset-state'
const RESET_UNIVERSE = 'reset-universe'
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
    const cs: CleanReduxState = action.payload
    return {
      connections: cs.connections,
      dmx: initUndoState(cs.dmx),
      gui: cs.gui,
      control: initUndoState(cs.control),
      midi: initUndoState(cs.midi),
      mixer: cs.mixer,
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
    midi: state.midi.present,
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
  return useTypedSelector((state) => getVal(state.midi.present))
}
