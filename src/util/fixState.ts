import { ReduxState } from '../redux/store'
import { string, number, union, object, array, makeFix, equal } from '../util/validate'
import { initConnectionsState, connectionsSchema } from '../redux/connectionsSlice'
import { initDmxState, dmxStateSchema, DmxState } from '../redux/dmxSlice'
import { initGuiState, guiStateSchema } from '../redux/guiSlice'
import { initMidiState, midiStateSchema } from '../redux/midiSlice'
import { initSceneState, sceneStateSchema } from '../redux/scenesSlice'
import { $CombinedState } from 'redux'

console.log('Running fixState.ts')

console.log('dmxStateSchema', dmxStateSchema)
// console.log('getDmxStateSchema()', getDmxStateSchema())

const reduxStateSchema = object<ReduxState>({
  connections: connectionsSchema,
  dmx: dmxStateSchema,
  midi: midiStateSchema,
  scenes: sceneStateSchema,
  gui: guiStateSchema,
  [$CombinedState]: undefined
})

console.log('reduxStateSchema', reduxStateSchema)

const fixState = makeFix<ReduxState>(reduxStateSchema, () => ({
  connections: initConnectionsState(),
  dmx: initDmxState(),
  midi: initMidiState(),
  scenes: initSceneState(),
  gui: initGuiState()
}))

export default function (oldState: ReduxState) {
  console.log('oldState', oldState)
  oldState.connections = initConnectionsState()
  const { fixed, err } = fixState(oldState)
  console.log('fixed', fixed)
  console.log('err', err)
  return oldState

  // const {gui, dmx, scenes} = oldState
  // if (gui.videos === undefined) gui.videos = []
  // if (gui.text === undefined) gui.text = []
  // if (dmx.overwrites === undefined) dmx.overwrites = []
  // if (dmx.groups === undefined) dmx.groups = []
  // dmx.universe.forEach(fixture => {
  //   if (fixture.groups === undefined) fixture.groups = []
  //   if (dmx.fixtureTypesByID[fixture.type] === undefined) {
  //     dmx.fixtureTypes.push(fixture.type)
  //     const newFt = initFixtureType()
  //     newFt.id = fixture.type
  //     dmx.fixtureTypesByID[fixture.type] = newFt
  //   }
  // })
  // dmx.fixtureTypes.forEach(ftId => {
  //   const ft = dmx.fixtureTypesByID[ftId]
  //   if (ft === undefined) dmx.fixtureTypesByID[ftId] = initFixtureType()
  // })
  // scenes.ids.forEach(id => {
  //   const scene = scenes.byId[id]
  //   if (scene.randomizer === undefined) scene.randomizer = initRandomizerOptions()
  //   if (scene.baseParams.Randomize === undefined) scene.baseParams.Randomize = 0
  //   scene.modulators.forEach(modulator => {
  //     if (modulator.modulation.Randomize === undefined) modulator.modulation.Randomize = 0.5
  //   })
  //   if (scene.groups === undefined) scene.groups = []
  // })
  // return oldState
}