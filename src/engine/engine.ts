import * as graphicsEngine from "./graphicsEngine"
import { updateTime } from '../redux/timeSlice'
import { setParams } from '../redux/paramsSlice'
import * as dmxEngine from './dmxEngine'
import { ReduxStore } from '../redux/store'
import { session } from "electron";
// import NodeLink from 'node-link'
const NodeLink = window.require('node-link');
import { getInitialModulators, modulateParams } from './modulationEngine';

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

  const newParams = modulateParams(timeState.beats, reduxStore.getState().modulators, reduxStore.getState().params)
  reduxStore.dispatch(setParams(newParams))

  reduxStore.dispatch(updateTime(timeState));

  graphicsEngine.update(timeState);
}
