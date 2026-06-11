import { configureStore, PayloadAction, AnyAction } from '@reduxjs/toolkit'
import {
  createDispatchHook,
  createSelectorHook,
  TypedUseSelectorHook,
  ReactReduxContextValue,
} from 'react-redux'
import React from 'react'
import { initTimeState, TimeState } from '../../shared/TimeState'
import { timeStatesVisuallyEqual } from '../../shared/timeExtrapolation'
import {
  defaultOutputParams,
  defaultParamsList,
  DefaultParam,
  getParam,
  Params,
} from '../../shared/params'
import { RandomizerState } from '../../shared/randomizer'
import {
  AudioEngineMetrics,
  initAudioEngineMetrics,
} from '../../shared/audioEngine'
import {
  AtmosRunState,
  initAtmosRunState,
} from '../../shared/atmospherics'

function initDmxOut(): number[] {
  return Array(512).fill(0)
}

export interface SplitState {
  outputParams: Params
  randomizer: RandomizerState
}

export interface RealtimeState {
  time: TimeState
  dmxOut: number[]
  dmxOutByUniverse: number[][]
  splitStates: SplitState[]
  audio: AudioEngineMetrics
  atmos: AtmosRunState
}

export function initRealtimeState(): RealtimeState {
  const dmxOut = initDmxOut()
  return {
    time: initTimeState(),
    dmxOut,
    dmxOutByUniverse: [dmxOut],
    splitStates: [],
    audio: initAudioEngineMetrics(),
    atmos: initAtmosRunState(),
  }
}

export function update(newRealtimeStore: RealtimeState) {
  return {
    type: 'update',
    payload: newRealtimeStore,
  }
}

export function updateTime(time: TimeState) {
  return {
    type: 'updateTime',
    payload: time,
  }
}

function realtimeStoreReducer(
  state = initRealtimeState(),
  action: PayloadAction<any>
) {
  if (action.type === 'update') {
    return action.payload
  }
  if (action.type === 'updateTime') {
    if (timeStatesVisuallyEqual(state.time, action.payload)) {
      return state
    }
    return {
      ...state,
      time: action.payload,
    }
  }
  return state
}

export const realtimeContext = React.createContext<
  ReactReduxContextValue<any, AnyAction> | null
>(null)

export const realtimeStore = configureStore({
  reducer: realtimeStoreReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
  devTools: { name: 'Realtime Store' },
})

export type RealtimeStore = typeof realtimeStore
export type RealtimeDispatch = typeof realtimeStore.dispatch
export const useRealtimeSelector: TypedUseSelectorHook<RealtimeState> =
  createSelectorHook(realtimeContext)
export const useRealtimeDispatch = createDispatchHook(realtimeContext)
const knownDefaultParams = new Set(defaultParamsList)

export function useOutputParam(
  param: DefaultParam | string,
  splitIndex: number
): number {
  const outputParam = useRealtimeSelector((state) => {
    return state.splitStates[splitIndex]?.outputParams?.[param]
  })
  if (outputParam === undefined) {
    if (knownDefaultParams.has(param as DefaultParam)) {
      return getParam({}, param as DefaultParam)
    }
    console.error(
      `useOutputParam called on undefined output param ${param}. That's probably not what you wanted.`
    )
    return 0
  } else {
    return outputParam
  }
}

export function useOutputParams(splitIndex: number): Params {
  const params = useRealtimeSelector((state) => {
    return state.splitStates[splitIndex]?.outputParams
  })
  if (params === undefined) {
    return defaultOutputParams()
  }
  return params
}
