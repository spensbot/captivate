import * as graphicsEngine from "./graphicsEngine"
import { updateTime } from '../redux/timeSlice'
import { setOutputParams } from '../redux/paramsSlice'
import * as dmxEngine from './dmxEngine'
import { ReduxStore } from '../redux/store'
const NodeLink = window.require('node-link');
import { modulateParams } from './modulationEngine';

let lastFrameTime = 0;
let engineTime = 0;
let initTime = 0;
let reduxStore: ReduxStore;
let nodeLink: typeof NodeLink;

export function init(_reduxStore: ReduxStore) {
  reduxStore = _reduxStore;
  nodeLink = new NodeLink();
  initTime = Date.now();
  graphicsEngine.init(reduxStore);
  dmxEngine.init(reduxStore);

  requestAnimationFrame(engineUpdate);
}

export function visualizerResize() {
  graphicsEngine.resize();
}

export function visualizerSetElement(domRef: any) {
  graphicsEngine.setDomElement(domRef);
}

function engineUpdate(time: number) {
  requestAnimationFrame(engineUpdate);

  const dt = time - lastFrameTime;

  if (dt < 10) return;

  lastFrameTime = time;
  engineTime += dt;

  const timeState = nodeLink.getSessionInfoCurrent();
  timeState.dt = dt;
  timeState.quantum = 4.0;

  const outputParams = modulateParams(timeState.beats, reduxStore.getState().modulators, reduxStore.getState().params.base, reduxStore.getState().params.modulation)
  reduxStore.dispatch(setOutputParams(outputParams))

  reduxStore.dispatch(updateTime(timeState));

  graphicsEngine.update(timeState);
}
