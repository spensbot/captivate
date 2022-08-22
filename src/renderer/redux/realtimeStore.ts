import { configureStore, PayloadAction, AnyAction } from '@reduxjs/toolkit'
import {
  createDispatchHook,
  createSelectorHook,
  TypedUseSelectorHook,
  ReactReduxContextValue,
} from 'react-redux'
import React from 'react'
import { initTimeState, TimeState } from '../../shared/TimeState'
import { defaultOutputParams, Param, Params } from '../../shared/params'
import { initRandomizerState, RandomizerState } from '../../shared/randomizer'

function initDmxOut(): number[] {
  return Array(512).fill(0)
}

export interface RealtimeState {
  outputParams: Params
  time: TimeState
  randomizer: RandomizerState
  dmxOut: number[]
  splitScenes: { outputParams: Params }[]
}

export function initRealtimeState(): RealtimeState {
  return {
    outputParams: defaultOutputParams(),
    time: initTimeState(),
    randomizer: initRandomizerState(),
    dmxOut: initDmxOut(),
    splitScenes: [],
  }
}

export function update(newRealtimeStore: RealtimeState) {
  return {
    type: 'update',
    payload: newRealtimeStore,
  }
}

function realtimeStoreReducer(
  state = initRealtimeState(),
  action: PayloadAction<any>
) {
  if (action.type === 'update') {
    return action.payload
  }
  return state
}

export const realtimeContext = React.createContext(
  {} as ReactReduxContextValue<any, AnyAction> // force it to work: https://github.com/reduxjs/react-redux/issues/1565
)

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

const initParamsCache = defaultOutputParams()

export function useOutputParam(
  param: Param,
  splitIndex: number | null
): number {
  const outputParam = useRealtimeSelector((state) => {
    return splitIndex === null
      ? state.outputParams[param]
      : state.splitScenes[splitIndex]?.outputParams[param]
  })
  if (outputParam === undefined) {
    return initParamsCache[param]
  }
  return outputParam
}

export function useOutputParams(splitIndex: number | null): Params {
  const params = useRealtimeSelector((state) => {
    return splitIndex === null
      ? state.outputParams
      : state.splitScenes[splitIndex]?.outputParams
  })
  if (params === undefined) {
    return defaultOutputParams()
  }
  return params
}
