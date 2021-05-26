import * as graphicsEngine from "./graphicsEngine"
import * as visualizerRef from '../components/visualizer/visualizerRef'
import * as dmxEngine from './dmxEngine'
import * as keyboardManager from './keyboardManager'
import { autoSave } from '../util/saveload_renderer'
import handleAutoScene from './autoScene'
import { ReduxStore } from '../redux/store'
import { RealtimeStore, update, TimeState } from '../redux/realtimeStore'
const NodeLink = window.require('node-link')
import { modulateParams } from './modulationEngine'
import maintainMidiConnection from './midiConnection'
import { addAction } from '../redux/midiSlice'
import { setActiveSceneIndex, setAutoSceneBombacity } from "../redux/scenesSlice"
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
    onConnect: () => { console.log("Connect") },
    onDisconnect: () => { console.log("Disconnect")},
    onMessage: (input) => {
      if (input) {
        const state = store.getState().midi
        if (state.isEditing) {
          if (state.listening) {
            store.dispatch(addAction({
              inputID: input.id,
              action: state.listening
            }))
          }
        } else {
          const action = state.byInputID[input.id]?.action
          if (action) {
            if (action.type === 'setActiveSceneIndex') {
              store.dispatch(setActiveSceneIndex(action.index))
            } else if (action.type === 'setAutoSceneBombacity') {
              if (input.value === undefined) {
                console.error('input.value === undefined')
                return
              }
              store.dispatch(setAutoSceneBombacity(input.value))
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
