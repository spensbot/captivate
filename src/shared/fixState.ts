import { CleanReduxState } from '../renderer/redux/store'
import { DmxValue, FixtureChannel } from './dmxFixtures'

type Deprecated_ChannelMode = {
  type: 'mode'
  min: DmxValue
  max: DmxValue
}

// Modify this function to fix any breaking state changes between upgrades
export default function fixState(state: CleanReduxState): CleanReduxState {
  // Swtich old mode channels to new custom channel
  for (const fixture of fixtureTypes(state)) {
    for (let i = 0; i < fixture.channels.length; i++) {
      let channel = fixture.channels[i] as
        | FixtureChannel
        | Deprecated_ChannelMode

      if (channel.type === 'mode') {
        const newChannel: FixtureChannel = {
          type: 'custom',
          name: 'mode',
          default: 0,
          min: channel.min,
          max: channel.max,
        }
        fixture.channels[i] = newChannel
      }
    }
  }

  // Add subfixtures to all fixtures
  for (const fixture of fixtureTypes(state)) {
    if (fixture.subFixtures === undefined) {
      fixture.subFixtures = []
    }
  }

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
