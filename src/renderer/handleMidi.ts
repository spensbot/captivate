import { MidiMessage } from '../engine/midi'
import { ReduxStore } from './redux/store'
import { RealtimeState } from './redux/realtimeStore'
import {
  setButtonAction,
  setSliderAction,
  getActionID,
  SliderAction,
} from './redux/midiSlice'
import {
  setActiveSceneIndex,
  setAutoSceneBombacity,
  setMaster,
  setBaseParams,
} from './redux/scenesSlice'

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
  let value = undefined
  if (msg.type === 'On') value = msg.velocity
  if (msg.type === 'CC') value = msg.value
  return {
    id: getInputID(msg),
    message: msg,
  }
}

export function handleMessage(
  message: MidiMessage,
  store: ReduxStore,
  rt_state: RealtimeState
) {
  const input = getInput(message)
  const midiState = store.getState().midi

  if (midiState.isEditing && midiState.listening) {
    if (midiState.listening.type === 'setActiveSceneIndex') {
      store.dispatch(
        setButtonAction({
          inputID: input.id,
          action: midiState.listening,
        })
      )
    } else {
      if (input.message.type === 'CC') {
        store.dispatch(
          setSliderAction({
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
          store.dispatch(
            setSliderAction({
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
          store.dispatch(setActiveSceneIndex(buttonAction.action.index))
        }
      }
    }
    const sliderAction = Object.entries(midiState.sliderActions).find(
      ([_actionId, action]) => action.inputID === input.id
    )?.[1]
    if (sliderAction) {
      const action = sliderAction.action
      const getOldVal = () => {
        const state = store.getState()
        if (action.type === 'setAutoSceneBombacity') {
          return state.scenes.auto.bombacity
        } else if (action.type === 'setBpm') {
          return rt_state.time.bpm
        } else if (action.type === 'setBaseParam') {
          return state.scenes.byId[state.scenes.active].baseParams[
            action.paramKey
          ]
        } else if (action.type === 'setMaster') {
          return state.scenes.master
        } else return 0
      }
      const setNewVal = (newVal: number) => {
        if (action.type === 'setAutoSceneBombacity') {
          store.dispatch(setAutoSceneBombacity(newVal))
        } else if (action.type === 'setMaster') {
          store.dispatch(setMaster(newVal))
        } else if (action.type === 'setBaseParam') {
          store.dispatch(
            setBaseParams({
              [action.paramKey]: newVal,
            })
          )
        } else if (action.type === 'setBpm') {
          const newTempo = newVal * 70 + 70
          // if (_nodeLink) _nodeLink.setTempo(newTempo)
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
