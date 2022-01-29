import { MidiMessage } from '../../engine/midi'
import { CleanReduxState } from '../../renderer/redux/store'
import { RealtimeState } from '../../renderer/redux/realtimeStore'
import { getActionID, SliderAction } from '../../renderer/redux/midiState'
import {
  midiSetButtonAction,
  midiSetSliderAction,
} from '../../renderer/redux/controlSlice'
import {
  setActiveSceneIndex,
  setAutoSceneBombacity,
  setMaster,
  setBaseParams,
} from '../../renderer/redux/controlSlice'
import NodeLink from 'node-link'
import { PayloadAction } from '@reduxjs/toolkit'

interface MidiInput {
  id: string
  message: MidiMessage
}

function getInputID(msg: MidiMessage): string {
  if (msg.type === 'On' || msg.type === 'Off')
    return 'note' + msg.number.toString()
  if (msg.type === 'CC') return 'cc' + msg.number
  return 'unknown'
}

function getInput(msg: MidiMessage): MidiInput {
  return {
    id: getInputID(msg),
    message: msg,
  }
}

export function handleMessage(
  message: MidiMessage,
  state: CleanReduxState,
  rt_state: RealtimeState,
  nodeLink: NodeLink,
  dispatch: (action: PayloadAction<any>) => void
) {
  const input = getInput(message)
  const midiState = state.control.midi

  if (midiState.isEditing && midiState.listening) {
    if (midiState.listening.type === 'setActiveSceneIndex') {
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
    const buttonAction = Object.entries(midiState.buttonActions).find(
      ([_actionId, action]) => action.inputID === input.id
    )?.[1]
    if (buttonAction) {
      if (input.message.type !== 'Off') {
        if (buttonAction.action.type === 'setActiveSceneIndex') {
          dispatch(
            setActiveSceneIndex({
              sceneType: 'light',
              val: buttonAction.action.index,
            })
          )
        }
      }
    }
    const sliderAction = Object.entries(midiState.sliderActions).find(
      ([_actionId, action]) => action.inputID === input.id
    )?.[1]
    if (sliderAction) {
      const action = sliderAction.action
      const getOldVal = () => {
        if (action.type === 'setAutoSceneBombacity') {
          return state.control.light.auto.bombacity
        } else if (action.type === 'setBpm') {
          return rt_state.time.bpm
        } else if (action.type === 'setBaseParam') {
          return state.control.light.byId[state.control.light.active]
            .baseParams[action.paramKey]
        } else if (action.type === 'setMaster') {
          return state.control.master
        } else return 0
      }
      const setNewVal = (newVal: number) => {
        if (action.type === 'setAutoSceneBombacity') {
          dispatch(
            setAutoSceneBombacity({
              sceneType: 'light',
              val: newVal,
            })
          )
        } else if (action.type === 'setMaster') {
          dispatch(setMaster(newVal))
        } else if (action.type === 'setBaseParam') {
          dispatch(
            setBaseParams({
              [action.paramKey]: newVal,
            })
          )
        } else if (action.type === 'setBpm') {
          const newTempo = newVal * 70 + 70
          nodeLink.setTempo(newTempo)
        }
      }
      const op = sliderAction.options
      const range = op.max - op.min
      if (op.type === 'cc') {
        if (input.message.type === 'CC') {
          setNewVal(op.min + (input.message.value / 127) * range)
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
