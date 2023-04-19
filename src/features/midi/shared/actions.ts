import type { actions } from '../../../renderer/redux/controlSlice/reducers/actions'
import type { UserCommand } from 'features/shared/engine/ipc_channels'

import type {
  CaseReducer,
  CaseReducerWithPrepare,
  PayloadAction,
} from '@reduxjs/toolkit'
import { ButtonFunction, SlidersFunction } from './config'
import { Pretty } from 'features/shared/shared/type-utils'

/**
 * From T, pick a set of properties whose keys are in the union K
 */
type Include<T extends string, K extends T> = K

type ReduxMidiActions = Include<
  keyof typeof actions,
  | 'setAutoSceneBombacity'
  | 'setMaster'
  | 'setBaseParam'
  | 'setPeriod'
  | 'setActiveSceneIndex'
>

type IpcMidiActions = Include<UserCommand['type'], 'SetBPM' | 'TapTempo'>

export type AllowedMidiActions = ReduxMidiActions | IpcMidiActions

export type Reductions = RemoveAutoProps<{
  setBaseParam: { splitIndex: true; value: true }
  setAutoSceneBombacity: { sceneType: true; val: true }
  SetBPM: { bpm: true }
  setPeriod: { newVal: true }
}>

type AllTrue<T> = T extends { [k in infer Key]?: unknown }
  ? Partial<{ [k in Key]: true }>
  : never

type RemoveProps<
  T extends { type: string },
  BlackList extends Partial<{ [k in string]: true }>
> = BlackList extends Partial<{ [k in string]: true }>
  ? Omit<T, keyof BlackList>
  : T

type RemoveAutoProps<
  T extends {
    [k in AllowedMidiActions]?: AllTrue<
      Omit<Extract<GetMidiAction<AllowedMidiActions>, { type: k }>, 'type'>
    >
  }
> = T

type GetReduxPayload<T> = T extends CaseReducer<
  any,
  PayloadAction<infer Payload>
>
  ? Payload extends Record<string | number | symbol, unknown>
    ? Payload
    : {}
  : T extends CaseReducerWithPrepare<any, infer _PayloadAction>
  ? _PayloadAction extends PayloadAction<infer Payload2, string, any, any>
    ? Payload2
    : {}
  : never

export type GetMidiAction<T extends AllowedMidiActions> =
  T extends UserCommand['type']
    ? Extract<UserCommand, { type: T }>
    : T extends keyof typeof actions
    ? Pretty<{ type: T } & GetReduxPayload<typeof actions[T]>>
    : never

type ApplyTransformations<k extends AllowedMidiActions> = RemoveProps<
  GetMidiAction<k>,
  k extends keyof Reductions ? Reductions[k] : {}
>

export type MidiActions = {
  [k in AllowedMidiActions]: Pretty<ApplyTransformations<k>>
}[AllowedMidiActions]

export type Config<Keys extends AllowedMidiActions = AllowedMidiActions> = {
  buttons: Partial<{
    [k in Keys]: ButtonFunction<ApplyTransformations<k>>
  }>
  range: Partial<{
    [k in Keys]: SlidersFunction<ApplyTransformations<k>>
  }>
}
