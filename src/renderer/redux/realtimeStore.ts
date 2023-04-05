import { configureStore, PayloadAction, AnyAction } from '@reduxjs/toolkit'
import {
  createDispatchHook,
  createSelectorHook,
  TypedUseSelectorHook,
  ReactReduxContextValue,
} from 'react-redux'
import React from 'react'
import { initTimeState, TimeState } from '../../features/bpm/shared/TimeState'
import { Params } from '../../features/params/shared/params'
import { RandomizerState } from '../../features/bpm/shared/randomizer'

function initDmxOut(): number[] {
  return Array(512).fill(0)
}

export interface SplitState {
  outputParams: Partial<Params>
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
