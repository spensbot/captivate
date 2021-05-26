import { ReduxState } from '../redux/store'
import { initFixtureType } from '../engine/dmxFixtures'
import { initRandomizerOptions } from '../engine/randomizer'

export default function (oldState: ReduxState) {
  const {gui, dmx, scenes} = oldState
  if (gui.videos === undefined) gui.videos = []
  if (gui.text === undefined) gui.text = []
  if (dmx.overwrites === undefined) dmx.overwrites = []
  if (dmx.groups === undefined) dmx.groups = []
  dmx.universe.forEach(fixture => {
    if (fixture.groups === undefined) fixture.groups = []
    if (dmx.fixtureTypesByID[fixture.type] === undefined) {
      dmx.fixtureTypes.push(fixture.type)
      const newFt = initFixtureType()
      newFt.id = fixture.type
      dmx.fixtureTypesByID[fixture.type] = newFt
    }
  })
  dmx.fixtureTypes.forEach(ftId => {
    const ft = dmx.fixtureTypesByID[ftId]
    if (ft === undefined) dmx.fixtureTypesByID[ftId] = initFixtureType()
  })
  scenes.ids.forEach(id => {
    if (scenes.byId[id].randomizer === undefined) scenes.byId[id].randomizer = initRandomizerOptions()
  })
  return oldState
}