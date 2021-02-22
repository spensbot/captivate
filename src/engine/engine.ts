import * as graphicsEngine from "./graphicsEngine"
import * as dmxEngine from './dmxEngine'
import { ReduxStore } from '../redux/store'
import { RealtimeStore, update } from '../redux/realtimeStore'
const NodeLink = window.require('node-link');
import { modulateParams } from './modulationEngine';

let _lastFrameTime = 0;
let _engineTime = 0;
let _initTime = 0;
let _store: ReduxStore;
let _realtimeStore: RealtimeStore;
let _nodeLink: typeof NodeLink;

export function init(store: ReduxStore, realtimeStore: RealtimeStore) {
  _store = store;
  _realtimeStore = realtimeStore;
  _nodeLink = new NodeLink();
  _initTime = Date.now();
  graphicsEngine.init();
  dmxEngine.init(store, realtimeStore);

  requestAnimationFrame(engineUpdate);
}

export function incrementTempo(amount: number) {
  if (_nodeLink) _nodeLink.setTempo(_realtimeStore.getState().time.bpm + amount);
}

export function setLinkEnabled(isEnabled: boolean) {
  if (_nodeLink) _nodeLink.enable(isEnabled);
}

export function visualizerResize() {
  graphicsEngine.resize();
}

export function visualizerSetElement(domRef: any) {
  graphicsEngine.setDomElement(domRef);
}

function engineUpdate(currentTime: number) {
  requestAnimationFrame(engineUpdate);

  const dt = currentTime - _lastFrameTime;

  if (dt < 10) return;

  _lastFrameTime = currentTime;
  _engineTime += dt;

  const timeState = _nodeLink.getSessionInfoCurrent();
  timeState.dt = dt;
  timeState.quantum = 4.0;

  const state = _store.getState()
  
  if (state.scenes.activeScene && state.scenes.scenesById[state.scenes.activeScene]) {
    const scene = state.scenes.scenesById[state.scenes.activeScene]
    
    const outputParams = modulateParams(timeState.beats, scene)
  
    const newRealtimeState = {
      time: timeState,
      outputParams: outputParams
    }
  
    _realtimeStore.dispatch(update(newRealtimeState))
  
    graphicsEngine.update(newRealtimeState);
  }
}
