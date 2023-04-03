import { RealtimeState } from '../../../renderer/redux/realtimeStore'
import NodeLink from 'node-link'
import { CleanReduxState } from '../../../renderer/redux/store'
import { PayloadAction } from '@reduxjs/toolkit'

type MidiContext = {
  rt_state: RealtimeState
  dispatch: (action: PayloadAction<any>) => void
  tapTempo: () => void
  nodeLink: NodeLink
  state: CleanReduxState
}


export type SlidersFunction<Action = unknown> = {
  set: (
    input: {
      action: Action

      newVal: number
    },
    context: MidiContext
  ) => void
  get?: (input: { action: Action }, context: MidiContext) => number
  key?: (action: Action) => string
}

export type ButtonFunction<Action = unknown> = {
  set: (
    input: {
      action: Action
    },
    context: MidiContext
  ) => void
  key?: (action: Action) => string
}

export const createMidiConfig = <
  Keys extends string,
  T extends {
    buttons: Partial<{
      [k in Keys]: ButtonFunction
    }>
    range: Partial<{
      [k in Keys]: SlidersFunction
    }>
  } = {
    buttons: Partial<{
      [k in Keys]: ButtonFunction
    }>
    range: Partial<{
      [k in Keys]: SlidersFunction
    }>
  }
>(
  t: T
) => {
  return t
}
