import { ReduxState } from '../redux/store'
import { initFixtureType } from '../engine/dmxFixtures'
import { initRandomizerOptions } from '../engine/randomizer'
// import { object, number, string, array, SchemaOf } from 'yup'
// import { DmxState } from '../redux/dmxSlice'
// import { GuiState } from '../redux/guiSlice'
// import { MidiState } from '../redux/midiSlice'
// import { SceneState } from '../redux/scenesSlice'


// const stateSchema = object({
//   dmx: object(),
//   gui: object(),
//   midi: object(),
//   scenes: object()
// })

// const dmxSchema: SchemaOf<DmxState> = object({
//   universe: array(),
//   fixtureTypes: object(),
//   fixtureTypesByID: object(),
//   editedFixture: object(),
//   selectedFixture: object(),
//   overwrites: object(),
//   groups: object()
// })


const stateDefaults: ReduxState = {
  connections: {
    dmx: {
      isConnected: false
    },
    midi: {
      isConnected: false
    },
  },
  dmx: {
    universe: [{
      ch: 0,
      type: '1',
      window: {},
      groups: []
    }],
    fixtureTypes: [],
    fixtureTypesByID: {a: {
      id: '',
      name: '',
      epicness: 0,
      channels: [{
        type: 'color',
        color: 'white'
      }]
    }},
    editedFixture: null,
    selectedFixture: null,
    overwrites: [],
    groups: []
  },
  gui: {
    activePage: 'Universe',
    blackout: false,
    videos: [],
    text: []
  },
  scenes: {
    ids: [],
    byId: {},
    active: '1',
    auto: {
      enabled: false,
      bombacity: 0,
      period: 4
    }
  },
  midi: {
    isEditing: false,
    byActionID: {},
    byInputID: {}
  }
}

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
    if (scenes.byId[id].baseParams.Randomize === undefined) scenes.byId[id].baseParams.Randomize = 0
    scenes.byId[id].modulators.forEach(modulator => {
      if (modulator.modulation.Randomize === undefined) modulator.modulation.Randomize = 0.5
    })
  })
  return oldState
}