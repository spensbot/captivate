import { MidiMessage, midiInputID } from '../../shared/midi'
import { CleanReduxState } from '../../renderer/redux/store'
import { RealtimeState } from '../../renderer/redux/realtimeStore'
import {
  buttonMidiActionTypes,
  getActionID,
  SliderAction,
  SliderControlOptions,
  MidiAction,
  initSliderOptions,
  normalizeSliderOptionsForAction,
} from '../../renderer/redux/deviceState'
import {
  midiSetButtonAction,
  midiSetSliderAction,
  setActiveSceneIndex,
  setAutoSceneBombacity,
  setMaster,
  setBaseParams,
  setAutoSceneEnabled,
} from '../../renderer/redux/controlSlice'
import {
  setBlackout,
  fireAtmosManualTrigger,
  setMoverFollowOverridePan,
  setMoverFollowOverrideTilt,
  toggleMoverFollowOverrideEnabled,
} from '../../renderer/redux/guiSlice'
import NodeLink from 'node-link'
import { PayloadAction } from '@reduxjs/toolkit'
import type { SceneType } from '../../shared/Scenes'
import { msUntilNextBeatBoundary } from '../../shared/sceneBeatQuantize'

const buttonThresholdState = new Map<string, boolean>()
const pendingMidiSceneTimeouts: Partial<
  Record<SceneType, ReturnType<typeof setTimeout>>
> = {}

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeCcValue(value: number): number {
  const maxRaw = value > 127 ? 255 : 127
  return clamp(value / maxRaw, 0, 1)
}

function normalizeNoteVelocity(velocity: number): number {
  const maxRaw = velocity > 127 ? 255 : 127
  return clamp(velocity / maxRaw, 0, 1)
}

// Handles a few common relative encoder styles:
// - 7-bit two's complement (1..63 up, 65..127 down, 64 center)
// - 8-bit signed (1..127 up, 129..255 down, 128 center)
function relativeCcDelta(value: number): number {
  if (value > 127) {
    if (value === 128) return 0
    const signed = value > 128 ? value - 256 : value
    return signed / 64
  }

  if (value === 64) return 0
  if (value > 64) {
    return (value - 128) / 64
  }
  return value / 64
}

function normalizeOptions(action: MidiAction, options: SliderControlOptions) {
  return normalizeSliderOptionsForAction(action, options)
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
    if (buttonMidiActionTypes.has(listenType)) {
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
            options: initSliderOptions(midiState.listening, 'cc'),
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
              options: initSliderOptions(midiState.listening, 'note'),
            })
          )
        }
      }
    }
    return
  }

  const buttonAction = Object.entries(midiState.buttonActions).find(
    ([_actionId, action]) => action.inputID === input.id
  )?.[1]

  if (buttonAction) {
    const actionKey = `${input.id}:${getActionID(buttonAction.action)}`

    const fireButtonAction = () => {
      if (buttonAction.action.type === 'setActiveSceneIndex') {
        const sceneType = buttonAction.action.sceneType
        const val = buttonAction.action.index
        const prev = pendingMidiSceneTimeouts[sceneType]
        if (prev !== undefined) {
          clearTimeout(prev)
        }
        const delayMs = msUntilNextBeatBoundary(rt_state.time)
        pendingMidiSceneTimeouts[sceneType] = setTimeout(() => {
          delete pendingMidiSceneTimeouts[sceneType]
          dispatch(setActiveSceneIndex({ sceneType, val }))
        }, delayMs)
      } else if (buttonAction.action.type === 'tapTempo') {
        tapTempo()
      } else if (buttonAction.action.type === 'toggleAutoScene') {
        const sceneType = buttonAction.action.sceneType
        dispatch(
          setAutoSceneEnabled({
            sceneType,
            val: !state.control[sceneType].auto.enabled,
          })
        )
      } else if (buttonAction.action.type === 'toggleBlackout') {
        dispatch(setBlackout(!state.gui.blackout))
      } else if (buttonAction.action.type === 'toggleMoverFollowOverride') {
        dispatch(toggleMoverFollowOverrideEnabled())
      } else if (buttonAction.action.type === 'triggerAtmosFixture') {
        dispatch(fireAtmosManualTrigger(buttonAction.action.fixtureId))
      }
    }

    if (input.message.type === 'CC') {
      const pressed = input.message.value >= 64
      const wasPressed = buttonThresholdState.get(actionKey) === true
      buttonThresholdState.set(actionKey, pressed)
      if (pressed && !wasPressed) {
        fireButtonAction()
      }
    } else if (input.message.type === 'On') {
      fireButtonAction()
    } else {
      buttonThresholdState.set(actionKey, false)
    }
  }

  const sliderAction = Object.entries(midiState.sliderActions).find(
    ([_actionId, action]) => action.inputID === input.id
  )?.[1]

  if (!sliderAction) return

  const action = sliderAction.action
  const options = normalizeOptions(action, sliderAction.options)
  const range = options.max - options.min

  const getOldVal = () => {
    if (action.type === 'setAutoSceneBombacity') {
      return state.control.light.auto.epicness
    } else if (action.type === 'setBpm') {
      return rt_state.time.bpm
    } else if (action.type === 'setBaseParam') {
      return (
        state.control.light.byId[state.control.light.active]?.splitScenes[0]
          .baseParams[action.paramKey] ?? 0.5
      )
    } else if (action.type === 'setMaster') {
      return state.control.master
    } else if (action.type === 'setMoverFollowOverridePan') {
      return state.gui.moverFollowOverridePan
    } else if (action.type === 'setMoverFollowOverrideTilt') {
      return state.gui.moverFollowOverrideTilt
    }

    return 0
  }

  const setNewVal = (newVal: number) => {
    const bounded = clamp(newVal, options.min, options.max)

    if (action.type === 'setAutoSceneBombacity') {
      dispatch(
        setAutoSceneBombacity({
          sceneType: 'light',
          val: bounded,
        })
      )
    } else if (action.type === 'setMaster') {
      dispatch(setMaster(bounded))
    } else if (action.type === 'setBaseParam') {
      dispatch(
        setBaseParams({
          splitIndex: 0,
          params: {
            [action.paramKey]: bounded,
          },
        })
      )
    } else if (action.type === 'setBpm') {
      nodeLink.setTempo(bounded)
    } else if (action.type === 'tapTempo') {
      tapTempo()
    } else if (action.type === 'setMoverFollowOverridePan') {
      dispatch(setMoverFollowOverridePan(clamp(bounded, 0, 1)))
    } else if (action.type === 'setMoverFollowOverrideTilt') {
      dispatch(setMoverFollowOverrideTilt(clamp(bounded, 0, 1)))
    }
  }

  if (options.type === 'cc') {
    if (input.message.type !== 'CC') return

    if (options.mode === 'absolute') {
      const normalized = normalizeCcValue(input.message.value)
      setNewVal(options.min + normalized * range)
    } else {
      const delta = relativeCcDelta(input.message.value) * range
      setNewVal(getOldVal() + delta)
    }
    return
  }

  if (input.message.type === 'On') {
    const normalizedVelocity = normalizeNoteVelocity(input.message.velocity)
    const val =
      options.value === 'velocity'
        ? options.min + normalizedVelocity * range
        : options.max

    if (options.mode === 'hold') {
      setNewVal(val)
    } else {
      if (getOldVal() > options.min) {
        setNewVal(options.min)
      } else {
        setNewVal(val)
      }
    }
  } else if (input.message.type === 'Off') {
    if (options.mode === 'hold') {
      setNewVal(options.min)
    }
  }
}
