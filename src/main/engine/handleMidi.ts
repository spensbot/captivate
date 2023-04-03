import { MidiMessage, midiInputID } from '../../shared/midi'
import { CleanReduxState } from '../../renderer/redux/store'
import { RealtimeState } from '../../renderer/redux/realtimeStore'
import { getActionID, SliderAction } from '../../renderer/redux/deviceState'
import {
  midiSetButtonAction,
  midiSetSliderAction,
} from '../../renderer/redux/controlSlice'
import NodeLink from 'node-link'
import { PayloadAction } from '@reduxjs/toolkit'
import midiConfig from './midi.config'
interface MidiInput {
  id: string
  message: MidiMessage
}

function getInput(msg: MidiMessage): MidiInput {
  return {
    id: midiInputID(msg),
    message: msg,
  }
}

type MidiContext = {
  rt_state: RealtimeState
  dispatch: (action: PayloadAction<any>) => void
  tapTempo: () => void
  nodeLink: NodeLink
  state: CleanReduxState
}

export type SlidersFunction = {
  set: (
    input: {
      action: unknown

      newVal: number
    },
    context: MidiContext
  ) => void
  get?: (input: {}, context: MidiContext) => number
}

export type ButtonFunction = {
  set: (
    input: {
      action: unknown
    },
    context: MidiContext
  ) => void
}

const isSliderFunction = (t: object): t is SlidersFunction => {
  return t.hasOwnProperty('set')
}

export type MidiConfig = {
  buttons: {
    [k: string]:
      | ButtonFunction
      | {
          [k: string]: ButtonFunction
        }
  }
  sliders: {
    [k: string]:
      | SlidersFunction
      | {
          [k: string]: SlidersFunction
        }
  }
}

export function handleMessage(
  message: MidiMessage,
  state: CleanReduxState,
  rt_state: RealtimeState,
  nodeLink: NodeLink,
  dispatch: (action: PayloadAction<any>) => void,
  tapTempo: () => void
) {
  const input = getInput(message)
  const midiState = state.control.device

  if (midiState.isEditing && midiState.listening) {
    const listenType = midiState.listening.type
    if (midiConfig.buttons[listenType]) {
      dispatch(
        midiSetButtonAction({
          inputID: input.id,
          action: midiState.listening,
        })
      )
    } else {
      if (input.message.type === 'CC') {
        dispatch(
          midiSetSliderAction({
            inputID: input.id,
            action: midiState.listening,
            options: {
              type: 'cc',
              min: 0,
              max: 1,
              mode: 'absolute',
            },
          })
        )
      } else if (input.message.type === 'On') {
        const actionId = getActionID(midiState.listening)
        const existing: SliderAction | undefined =
          midiState.sliderActions[actionId]
        if (
          existing &&
          existing.inputID === input.id &&
          existing.options.type === 'note'
        ) {
          // if the note is already set, do nothing
        } else {
          dispatch(
            midiSetSliderAction({
              inputID: input.id,
              action: midiState.listening,
              options: {
                type: 'note',
                min: 0,
                max: 1,
                value: 'velocity',
                mode: 'hold',
              },
            })
          )
        }
      }
    }
  } else {
    const context = { dispatch, nodeLink, rt_state, state, tapTempo }
    const buttonAction = Object.entries(midiState.buttonActions).find(
      ([_actionId, action]) => action.inputID === input.id
    )?.[1]
    if (buttonAction) {
      if (input.message.type !== 'Off') {
        const buttonConfig: MidiConfig['buttons'] =
          midiConfig.buttons[action.type]
        const set: ButtonFunction['set'] = isSliderFunction(buttonConfig)
          ? buttonConfig.set
          : buttonConfig[buttonAction.action.param].set

        set({ action: buttonAction.action }, context)
      }
    }
    const sliderAction = Object.entries(midiState.sliderActions).find(
      ([_actionId, action]) => action.inputID === input.id
    )?.[1]

    if (sliderAction) {
      const action = sliderAction.action
      const sliderConfig: MidiConfig['sliders'] =
        midiConfig.sliders[action.type]

      const getOldVal = () => {
        const get: SlidersFunction['get'] = isSliderFunction(sliderAction)
          ? sliderAction.get
          : sliderAction[action.param].get

        if (get) {
          return get({}, context)
        } else {
          return 0
        }
      }
      const setNewVal = (newVal: number) => {
        const set: SlidersFunction['set'] = isSliderFunction(sliderConfig)
          ? sliderConfig.set
          : sliderConfig[action.param].set

        set({ newVal, action }, context)
      }
      const op = sliderAction.options
      const range = op.max - op.min
      if (op.type === 'cc') {
        if (input.message.type === 'CC') {
          if (op.mode === 'absolute') {
            setNewVal(op.min + (input.message.value / 127) * range)
          } else {
            // relative
            let mapped = (input.message.value - 64) / 5
            setNewVal(getOldVal() + mapped)
          }
        }
      } else if (op.type === 'note') {
        if (input.message.type === 'On') {
          const val =
            op.value === 'velocity'
              ? op.min + (input.message.velocity / 127) * range
              : op.max
          if (op.mode === 'hold') {
            setNewVal(val)
          } else if (op.mode === 'toggle') {
            if (getOldVal() > op.min) {
              setNewVal(op.min)
            } else {
              setNewVal(val)
            }
          }
        } else if (input.message.type == 'Off') {
          if (op.mode === 'hold') {
            setNewVal(op.min)
          }
        }
      }
    }
  }
}
