import * as graphicsEngine from "./graphicsEngine"
import * as visualizerRef from '../components/visualizer/visualizerRef'
import * as dmxEngine from './dmxEngine'
import { getDmxBuffer } from './dmxConnection'
import * as keyboardManager from './keyboardManager'
import handleAutoScene from './autoScene'
import { ReduxStore } from '../redux/store'
import { autoSave } from '../util/saveload_renderer'
import { RealtimeStore, update, TimeState, RealtimeState } from '../redux/realtimeStore'
const NodeLink = window.require('node-link')
import { modulateParams } from './modulationEngine'
import maintainMidiConnection from './midiConnection'
import { getActionID, setButtonAction, setSliderAction, SliderAction, MidiAction } from '../redux/midiSlice'
import { setMidi } from '../redux/connectionsSlice'
import { setActiveSceneIndex, setAutoSceneBombacity, setBaseParams, setMaster } from "../redux/scenesSlice"
import { syncAndUpdate } from './randomizer'

let _lastFrameTime = 0
let _engineTime = 0
let _initTime = 0
let _store: ReduxStore
let _realtimeStore: RealtimeStore
let _nodeLink: typeof NodeLink

let _lastMidiTime = Date.now()

export function init(store: ReduxStore, realtimeStore: RealtimeStore) {
  _store = store
  _realtimeStore = realtimeStore
  _nodeLink = new NodeLink()
  _initTime = Date.now()
  autoSave(_store)
  dmxEngine.init(store, realtimeStore)
  keyboardManager.init(store)
  maintainMidiConnection({
    updateInterval: 1000,
    onConnect: (deviceName) => { store.dispatch(setMidi({isConnected: true, path: deviceName}))},
    onDisconnect: () => { store.dispatch(setMidi({isConnected: false}))},
    onMessage: (input) => {
      console.log(`Midi dt: ${Date.now() - _lastMidiTime}ms`)
      _lastMidiTime = Date.now()
      if (input) {
        const midiState = store.getState().midi
        if (midiState.isEditing) {
          if (midiState.listening) {
            if (midiState.listening.type === 'setActiveSceneIndex') {
              store.dispatch(setButtonAction({
                inputID: input.id,
                action: midiState.listening
              }))
            } else {
              if (input.message.type === 'CC') {
                store.dispatch(setSliderAction({
                  inputID: input.id,
                  action: midiState.listening,
                  options: {
                    type: 'cc',
                    min: 0,
                    max: 1
                  }
                }))
              } else if (input.message.type === 'On') {
                const actionId = getActionID(midiState.listening)
                const existing: SliderAction | undefined = midiState.sliderActions[actionId]
                if (existing && existing.inputID === input.id && existing.options.type === 'note') {
                  // if the note is already set, do nothing
                } else {
                  store.dispatch(setSliderAction({
                    inputID: input.id,
                    action: midiState.listening,
                    options: {
                      type: 'note',
                      min: 0,
                      max: 1,
                      value: 'velocity',
                      mode: 'hold'
                    }
                  }))
                }
              }
            }
          }
        } else {
          const buttonAction = Object.entries(midiState.buttonActions).find(([actionId, action]) => action.inputID === input.id )?.[1]
          if (buttonAction) {
            if (buttonAction.action.type === 'setActiveSceneIndex') {
              store.dispatch(setActiveSceneIndex(buttonAction.action.index));
            }
          }
          const sliderAction = Object.entries(midiState.sliderActions).find(([actionId, action]) => action.inputID === input.id)?.[1]
          if (sliderAction) {
            const action = sliderAction.action
            const getOldVal = () => {
              const state = store.getState()
              if (action.type === 'setAutoSceneBombacity') {
                return state.scenes.auto.bombacity
              } else if (action.type === 'setBpm') {
                return realtimeStore.getState().time.bpm
              } else if (action.type === 'setBaseParam') {
                return state.scenes.byId[state.scenes.active].baseParams[action.paramKey]
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
                store.dispatch(setBaseParams({
                    [action.paramKey]: newVal
                  }))
              } else if (action.type === 'setBpm') {
                const newTempo = newVal * 70 + 70
                if (_nodeLink) _nodeLink.setTempo(newTempo)
              }
            }
            const op = sliderAction.options
            const range = op.max - op.min
            if (op.type === 'cc') {
              if (input.message.type === 'CC') {
                setNewVal(op.min + input.message.value / 127 * range)
              }
            } else if (op.type === 'note') {
              if (input.message.type === 'On') {
                const val = (op.value === 'velocity') ? (op.min + input.message.velocity / 127 * range) : op.max
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
      } else {
        console.log('message === null')
      }
    }
  })

  requestAnimationFrame(engineUpdate)
}

export function incrementTempo(amount: number) {
  if (_nodeLink) _nodeLink.setTempo(_realtimeStore.getState().time.bpm + amount)
}

export function setLinkEnabled(isEnabled: boolean) {
  if (_nodeLink) _nodeLink.enable(isEnabled)
}

function engineUpdate(currentTime: number) {
  requestAnimationFrame(engineUpdate)

  const dt = currentTime - _lastFrameTime

  if (dt < 10) return

  _lastFrameTime = currentTime
  _engineTime += dt

  const timeState: TimeState = _nodeLink.getSessionInfoCurrent()

  timeState.dt = dt
  timeState.quantum = 4.0

  const state = _store.getState()
  const realtimeState = _realtimeStore.getState()
  
  if (state.scenes.active && state.scenes.byId[state.scenes.active]) {
    const scene = state.scenes.byId[state.scenes.active]
    
    const outputParams = modulateParams(timeState.beats, scene)

    const dmxOut: number[] = []
    for (let i=0; i<512; i++) {
      dmxOut[i] = getDmxBuffer()[i+1]
    }
  
    const newRealtimeState: RealtimeState = {
      time: timeState,
      outputParams: outputParams,
      randomizer: syncAndUpdate(realtimeState.randomizer, state.dmx.universe, timeState, scene.randomizer),
      dmxOut: dmxOut
    }
  
    _realtimeStore.dispatch(update(newRealtimeState))

    handleAutoScene(_store, newRealtimeState.time)
  
    visualizerRef.update(newRealtimeState)
  }
}
