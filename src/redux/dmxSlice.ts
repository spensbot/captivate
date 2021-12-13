import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Fixture, FixtureType, Universe, fixtureTypes, fixtureTypesByID, getTestUniverse, fixtureSchema, fixtureTypeSchema } from '../engine/dmxFixtures';
import { clampNormalized } from '../util/helpers'
import { string, number, union, object, boolean, array, map } from '../util/validate'

export interface DmxState {
  universe: Universe
  fixtureTypes: string[]
  fixtureTypesByID: {[id: string]: FixtureType}
  editedFixture: null | string
  selectedFixture: null | number
  overwrites: number[]
  groups: string[]
}

export const dmxStateSchema = object<DmxState>({
  universe: array(fixtureSchema),
  fixtureTypes: array(string()),
  fixtureTypesByID: map(fixtureTypeSchema),
  editedFixture: union(null, string()),
  selectedFixture: union(null, number()),
  overwrites: array(number()),
  groups: array(string())
})

interface SetFixtureWindowPayload {
  x: number
  y: number
  index: number
}

interface IncrementFixtureWindowPayload {
  dWidth: number
  dHeight: number
  index: number
}

interface SetFixtureWindowEnabledPayload {
  dimension: 'x' | 'y',
  index: number,
  isEnabled: boolean
}

export function initDmxState(): DmxState {
  return {
    universe: getTestUniverse(),
    fixtureTypes: fixtureTypes,
    fixtureTypesByID: fixtureTypesByID,
    editedFixture: null,
    selectedFixture: null,
    overwrites: [],
    groups: []
  }
}

export const dmxSlice = createSlice({
  name: 'dmx',
  initialState: initDmxState(),
  reducers: {
    resetDmxState: (state, { payload }: PayloadAction<DmxState>) => {
      state = payload
    },
    setSelectedFixture: (state, { payload }: PayloadAction<number>) => {
      state.selectedFixture = payload
    },
    addFixture: (state, { payload }: PayloadAction<Fixture>) => {
      state.universe.push(payload)
    },
    removeFixture: (state, { payload }: PayloadAction<number>) => {
      state.universe.splice(payload, 1)
    },
    setFixtureWindow: (state, { payload }: PayloadAction<SetFixtureWindowPayload>) => {
      const window = state.universe[payload.index].window
      if (window.x) {
        window.x.pos = payload.x
      }
      if (window.y) {
        window.y.pos = payload.y
      }
    },
    setFixtureWindowEnabled: (state, { payload }: PayloadAction<SetFixtureWindowEnabledPayload>) => {
      const window = state.universe[payload.index].window
      if (payload.isEnabled) {
        window[payload.dimension] = {
          pos: 0.5,
          width: 0
        }
      } else {
        delete window[payload.dimension]
      }
    },
    incrementFixtureWindow: (state, { payload }: PayloadAction<IncrementFixtureWindowPayload>) => {
      const window = state.universe[payload.index].window
      if (window.x) {
        window.x.width = clampNormalized(window.x.width + payload.dWidth) 
      }
      if (window.y) {
        window.y.width = clampNormalized(window.y.width + payload.dHeight) 
      }
    },
    setSelectedFixtureGroups: (state, { payload }: PayloadAction<string[]>) => {
      const i = state.selectedFixture
      if (i === null) {
        console.error('i === null')
        return
      }
      if (state.universe[i] === undefined) {
        console.warn(state.universe[i] === undefined)
        return
      }
      state.universe[i].groups = payload
    },
    setEditedFixture: (state, {payload}: PayloadAction<null|string >) => {
      state.editedFixture = payload
    },
    addFixtureType: (state, {payload}: PayloadAction<FixtureType>) => {
      state.fixtureTypes.push(payload.id)
      state.fixtureTypesByID[payload.id] = payload
      state.editedFixture = payload.id
    },
    updateFixtureType: (state, { payload }: PayloadAction<FixtureType>) => {
      state.fixtureTypesByID[payload.id] = payload
    },
    deleteFixtureType: (state, { payload }: PayloadAction<string>) => {
      let index = state.fixtureTypes.indexOf(payload);
      if (index !== -1) {
        state.fixtureTypes.splice(index, 1);
      }
      delete state.fixtureTypesByID[payload]
    },
    setOverwrite: (state, { payload }: PayloadAction<{ index: number, value: number }>) => {
      state.overwrites[payload.index] = payload.value
    },
    setGroups: (state, { payload }: PayloadAction<string[]>) => {
      state.groups = payload
    }
  },
});

export const {
  resetDmxState,
  setSelectedFixture,
  setEditedFixture,
  setFixtureWindow,
  setFixtureWindowEnabled,
  setSelectedFixtureGroups,
  incrementFixtureWindow,
  addFixture,
  removeFixture,
  addFixtureType,
  updateFixtureType,
  deleteFixtureType,
  setOverwrite,
  setGroups
} = dmxSlice.actions;

export default dmxSlice.reducer;