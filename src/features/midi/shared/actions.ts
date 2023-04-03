import * as Controller from '../../../renderer/redux/controlSlice'
import { UserCommand } from 'shared/ipc_channels'
import { ButtonFunction, SlidersFunction } from '../engine/handleMidi'

/**
 * From T, pick a set of properties whose keys are in the union K
 */
type Include<T extends string, K extends T> = K

type ReduxMidiActions = Include<
  keyof typeof Controller,
  | 'setAutoSceneBombacity'
  | 'setMaster'
  | 'setBaseParam'
  | 'setPeriod'
  | 'setActiveSceneIndex'
>

type IpcMidiActions = Include<UserCommand['type'], 'SetBPM' | 'TapTempo'>

export type AllowedMidiActions = ReduxMidiActions | IpcMidiActions

type GetReduxPayload<T> = T extends (payload: infer P) => any ? P : never;

export type GetMidiAction<T extends string> = T extends UserCommand['type']
  ? Extract<UserCommand, { type: T }>
  : T extends keyof typeof Controller
  ? GetReduxPayload<typeof Controller[T]>
  : never

export type Config<Keys extends string> = {
  buttons: Partial<{
    [k in Keys]: ButtonFunction<GetMidiAction<k>>
  }>
  sliders: Partial<{
    [k in Keys]: SlidersFunction<GetMidiAction<k>>
  }>
}
