import { MidiMessage, midiInputID } from '../shared/midi'
import { CleanReduxState } from '../../../renderer/redux/store'
import { RealtimeState } from '../../../renderer/redux/realtimeStore'
import { SliderAction } from '../redux'
import {
  midiSetButtonAction,
  midiSetSliderAction,
} from '../../../renderer/redux/controlSlice'
import NodeLink from 'node-link'
import { PayloadAction } from '@reduxjs/toolkit'
import _midiConfig from './midi.config'
import { getActionID } from '../redux'
import { ButtonFunction, SlidersFunction } from '../shared/config'
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

export type MidiConfig = {
  buttons: {
    [k: string]: ButtonFunction
  }
  range: {
    [k: string]: SlidersFunction
  }
}

const midiConfig = _midiConfig as MidiConfig

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
    /**
     * When we receive first signal from midi attach to action
     */
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
    /**
     * Receive Midi Data
     */
    const context = { dispatch, nodeLink, rt_state, state, tapTempo }
    const buttonAction = Object.entries(midiState.buttonActions).find(
      ([_actionId, action]) => action.inputID === input.id
    )?.[1]
    if (buttonAction) {
      if (input.message.type !== 'Off') {
        const buttonConfig: MidiConfig['buttons'][string] =
          midiConfig.buttons[buttonAction.action.type]

        const set: ButtonFunction['set'] = buttonConfig.set

        set({ action: buttonAction.action }, context)
      }
    }
    const sliderAction = Object.entries(midiState.sliderActions).find(
      ([_actionId, action]) => action.inputID === input.id
    )?.[1]

    if (sliderAction) {
      const action = sliderAction.action
      const sliderConfig: MidiConfig['range'][string] =
        midiConfig.range[action.type]

      const getOldVal = () => {
        const get: SlidersFunction['get'] = sliderConfig.get

        if (get) {
          return get({ action }, context)
        } else {
          return 0
        }
      }
      const setNewVal = (newVal: number) => {
        const set: SlidersFunction['set'] = sliderConfig.set

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

/**
 * Idea for control flow configuration
 *
const t = {
  button: {
    On: () => {},
    CC: () => {},
  },
  slider: {
    cc: {
      CC: {
        absolute: ({ setNewVal, op, input, range }) => {
          setNewVal(op.min + (input.message.value / 127) * range)
        },
        $default: ({ input, setNewVal, getOldVal }) => {
          // relative
          let mapped = (input.message.value - 64) / 5
          setNewVal(getOldVal() + mapped)
        },
      },
    },
    note: {
      On: ({ op, input, range }) => {
        const val =
          op.value === 'velocity'
            ? op.min + (input.message.velocity / 127) * range
            : op.max
        return {
          hold: ({ setNewVal }) => {
            setNewVal(val)
          },
          toggle: ({ getOldVal, setNewVal }) => {
            if (getOldVal() > op.min) {
              setNewVal(op.min)
            } else {
              setNewVal(val)
            }
          },
        }
      },
      Off: {
        hold: () => {
          setNewVal(op.min)
        },
      },
    },
  },
}
 */
