import { configureStore, PayloadAction, AnyAction } from '@reduxjs/toolkit'
import {
  createDispatchHook,
  createSelectorHook,
  TypedUseSelectorHook,
  ReactReduxContextValue,
} from 'react-redux'
import React from 'react'
import { initTimeState, TimeState } from '../../shared/TimeState'
import { defaultOutputParams, DefaultParam, Params } from '../../features/dmx/shared/params'
import { RandomizerState } from '../../shared/randomizer'

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
  splitStates: SplitState[]
}

export function initRealtimeState(): RealtimeState {
  return {
    time: initTimeState(),
    dmxOut: initDmxOut(),
    splitStates: [],
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

export function useOutputParam(
  param: DefaultParam | string,
  splitIndex: number
): number {
  const outputParam = useRealtimeSelector((state) => {
    return state.splitStates[splitIndex]?.outputParams?.[param]
  })
  if (outputParam === undefined) {
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
