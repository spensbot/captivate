import { configureStore, PayloadAction } from '@reduxjs/toolkit'
import { createDispatchHook, createSelectorHook, TypedUseSelectorHook } from 'react-redux'
import { initParams } from '../engine/params';
import React from 'react'
import { initRandomizerState } from '../engine/randomizer'

export interface TimeState {
  bpm: number
  beats: number
  phase: number
  numPeers: number
  isEnabled: boolean
  quantum: number
  dt: number
}

function initTime(): TimeState {
  return {
    bpm: 90.0, // (from LINK)
    beats: 0.0, // running total of beats (from LINK)
    phase: 0.0, // from 0.0 to quantum (from LINK)
    numPeers: 0,
    isEnabled: false,
    quantum: 4.0,
    dt: 0.0,
  }
}

function initDmxOut(): number[] {
  return Array(512).fill(0)
}

const initState = {
  outputParams: initParams(),
  time: initTime(),
  randomizer: initRandomizerState(),
  dmxOut: initDmxOut()
}

export type RealtimeState = typeof initState

export function update(newRealtimeStore: RealtimeState) {
  return {
    type: 'update',
    payload: newRealtimeStore
  }
}

function realtimeStoreReducer(state = initState, action: PayloadAction<any>) {
  if (action.type === 'update') {
    return action.payload
  }
  return state
}

export const realtimeContext = React.createContext(null)

export const realtimeStore = configureStore({
  reducer: realtimeStoreReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false,
    immutableCheck: false
  })
})

export type RealtimeStore = typeof realtimeStore
export type RealtimeDispatch = typeof realtimeStore.dispatch
export const useRealtimeSelector: TypedUseSelectorHook<RealtimeState> = createSelectorHook(realtimeContext)
export const useRealtimeDispatch = createDispatchHook(realtimeContext)