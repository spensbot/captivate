import { CleanReduxState } from '../renderer/redux/store'

// Modify this function to fix any breaking state changes between upgrades
export default function fixState(state: CleanReduxState): CleanReduxState {
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
