import * as graphicsEngine from "./graphicsEngine"
import * as visualizerRef from '../components/visualizer/visualizerRef'
import * as dmxEngine from './dmxEngine'
import * as keyboardManager from './keyboardManager'
import handleAutoScene from './autoScene'
import { ReduxStore } from '../redux/store'
import { autoSave } from '../util/saveload_renderer'
import { RealtimeStore, update, TimeState } from '../redux/realtimeStore'
const NodeLink = window.require('node-link')
import { modulateParams } from './modulationEngine'
import maintainMidiConnection from './midiConnection'
import { getActionID, setButtonAction, setSliderAction, SliderAction } from '../redux/midiSlice'
import { setMidi } from '../redux/connectionsSlice'
import { setActiveSceneIndex, setAutoSceneBombacity, setBaseParams, setMaster } from "../redux/scenesSlice"
import { syncAndUpdate } from './randomizer'

let _lastFrameTime = 0
let _engineTime = 0
let _initTime = 0
let _store: ReduxStore
let _realtimeStore: RealtimeStore
let _nodeLink: typeof NodeLink

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
      if (input) {
        const state = store.getState().midi
        if (state.isEditing) {
          if (state.listening) {
            if (state.listening.type === 'setActiveSceneIndex') {
              store.dispatch(setButtonAction({
                inputID: input.id,
                action: state.listening
              }))
            } else {
              if (input.message.type === 'CC') {
                store.dispatch(setSliderAction({
                  inputID: input.id,
                  action: state.listening,
                  options: {
                    type: 'cc',
                    min: 0,
                    max: 1
                  }
                }))
              } else if (input.message.type === 'On') {
                const actionId = getActionID(state.listening)
                const existing: SliderAction | undefined = state.sliderActions[actionId]
                if (existing && existing.inputID === input.id && existing.options.type === 'note') {
                  const existBeh = existing.options.behavior
                  store.dispatch(setSliderAction({
                    ...existing,
                    options: {
                      ...existing.options,
                      behavior: existBeh === 'velocity' ? 'toggle' : existBeh === 'toggle' ? 'hold' : 'velocity'
                    }
                  }))
                } else {
                  store.dispatch(setSliderAction({
                    inputID: input.id,
                    action: state.listening,
                    options: {
                      type: 'note',
                      min: 0,
                      max: 1,
                      behavior: 'velocity'
                    }
                  }))
                }
              }
            }
          }
        } else {
          const buttonAction = Object.entries(state.buttonActions).find(([actionId, action]) => action.inputID === input.id )?.[1]
          if (buttonAction) {
            if (buttonAction.action.type === 'setActiveSceneIndex') {
              store.dispatch(setActiveSceneIndex(buttonAction.action.index));
            }
          }
          console.log(input.id)
          console.log(state.sliderActions)
          const sliderAction = Object.entries(state.sliderActions).find(([actionId, action]) => action.inputID === input.id )?.[1]
          if (sliderAction) {
            console.log('made it')
            const setNewVal = (newVal: number) => {
              if (sliderAction.action.type === 'setAutoSceneBombacity') {
                store.dispatch(setAutoSceneBombacity(newVal))
              } else if (sliderAction.action.type === 'setMaster') {
                store.dispatch(setMaster(newVal))
              } else if (sliderAction.action.type === 'setBaseParam') {
                store.dispatch(setBaseParams({
                    [sliderAction.action.paramKey]: newVal
                  }))
              } else if (sliderAction.action.type === 'setBpm') {
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
              if (op.behavior === 'velocity') {
                if (input.message.type === 'On') {
                  setNewVal(op.min + input.message.velocity / 127 * range)
                }
              } else if (op.behavior === 'hold') {
                if (input.message.type === 'On') {
                  setNewVal(op.max)
                } else if (input.message.type === 'Off') {
                  setNewVal(op.min)
                }
              } else if (op.behavior === 'toggle') {
                if (input.message.type === 'On') {
                  setNewVal(op.max)
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
  
    const newRealtimeState = {
      time: timeState,
      outputParams: outputParams,
      randomizer: syncAndUpdate(realtimeState.randomizer, state.dmx.universe, timeState, scene.randomizer)
    }
  
    _realtimeStore.dispatch(update(newRealtimeState))

    handleAutoScene(_store, newRealtimeState.time)
  
    visualizerRef.update(newRealtimeState)
  }
}
