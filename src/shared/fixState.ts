import { CleanReduxState } from '../renderer/redux/store'
import { Lfo } from './oscillator'
import { Modulator } from './modulation'

export enum LegacyLfoShape {
  Sin,
  Ramp,
}
export interface LegacyLfo extends Lfo {
  shape: LegacyLfoShape
}

export interface LegacyModulator extends Modulator {
  lfo: LegacyLfo
}

// Modify this function to fix any breaking state changes between upgrades
export default function fixState(state: CleanReduxState): CleanReduxState {
  modulators(state).forEach((modulator) => {
    if (modulator.mod === undefined) {
      const legacyModulator = modulator as LegacyModulator
      const legacyLfo = legacyModulator.lfo
      const lfo: Lfo = {
        ...legacyLfo,
        type: legacyLfo.shape === LegacyLfoShape.Sin ? 'Sin' : 'Ramp',
      }
      modulator.mod = lfo
    }
    if (state.control.device.connectable.audio === undefined) {
      state.control.device.connectable.audio = []
    }
  })
  return state
}

//@ts-ignore
function fixtureTypes(state: CleanReduxState) {
  return state.dmx.fixtureTypes.map((id) => state.dmx.fixtureTypesByID[id])
}
//@ts-ignore
function channels(state: CleanReduxState) {
  return fixtureTypes(state)
    .map((ft) => ft.channels)
    .flat()
}
//@ts-ignore
function lightScenes(state: CleanReduxState) {
  return state.control.light.ids.map((id) => state.control.light.byId[id])
}
//@ts-ignore
function visualScenes(state: CleanReduxState) {
  return state.control.visual.ids.map((id) => state.control.visual.byId[id])
}
//@ts-ignore
function modulators(state: CleanReduxState) {
  return lightScenes(state)
    .map((scene) => scene.modulators)
    .flat()
}
//@ts-ignore
function splits(state: CleanReduxState) {
  return lightScenes(state)
    .map((scene) => scene.splitScenes)
    .flat()
}
