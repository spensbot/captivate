import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Fixture, FixtureType, Universe, fixtureTypes, fixtureTypesByID, getTestUniverse } from '../engine/dmxFixtures';
import { Window2D_t } from '../types/baseTypes'
import {clampNormalized} from '../util/helpers'

type DmxState = {
  universe: Universe
  fixtureTypes: string[]
  fixtureTypesByID: {[id: string]: FixtureType}
  editedFixture: null | string
  selectedFixture: null | number
}

interface AddFixturePayload {
  fixture: Fixture,
  channel: number
}

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

const initialDmxState: DmxState = {
  universe: getTestUniverse(),
  fixtureTypes: fixtureTypes,
  fixtureTypesByID: fixtureTypesByID,
  editedFixture: null,
  selectedFixture: null
}

export const dmxSlice = createSlice({
  name: 'dmx',
  initialState: initialDmxState,
  reducers: {
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
    // addFixture: (state, {payload}: PayloadAction<AddFixturePayload>) => {
    //   state.universe[payload.channel] = payload.fixture
    // },
    // removeFixture: (state, {payload}: PayloadAction<number>) => {
    //   state.universe[payload] = null
    // },
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
    }
  },
});

export const { setSelectedFixture, setEditedFixture, setFixtureWindow, setFixtureWindowEnabled, incrementFixtureWindow, addFixture, removeFixture, addFixtureType, updateFixtureType, deleteFixtureType } = dmxSlice.actions;

export default dmxSlice.reducer;