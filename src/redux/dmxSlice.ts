import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Fixture, FixtureType, Universe, fixtureTypes, fixtureTypesByID, getTestUniverse } from '../engine/dmxFixtures';

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

export const { setEditedFixture, addFixture, removeFixture, addFixtureType, updateFixtureType, deleteFixtureType } = dmxSlice.actions;

export default dmxSlice.reducer;