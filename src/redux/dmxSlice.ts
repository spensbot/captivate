import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Fixture, FixtureType, fixtureTypes, fixtureTypesByID, testUniverse } from '../engine/dmxFixtures';

type DmxState = {
  universe: Fixture[]
  fixtureTypes: string[]
  fixtureTypesByID: {[id: string]: FixtureType}
  editedFixture: null | string
}

const initialDmxState: DmxState = {
  universe: testUniverse,
  fixtureTypes: fixtureTypes,
  fixtureTypesByID: fixtureTypesByID,
  editedFixture: null
}

export const dmxSlice = createSlice({
  name: 'dmx',
  initialState: initialDmxState,
  reducers: {
    setEditedFixture: (state, {payload}: PayloadAction<null|string >) => {
      state.editedFixture = payload
    },
    addFixture: (state, action: PayloadAction<Fixture>) => {
      state.universe[action.payload.channelNum] = action.payload
    },
    removeFixture: (state, action: PayloadAction<Fixture>) => {
      delete state.universe[action.payload.channelNum]
    },
    addFixtureType: (state, {payload}: PayloadAction<FixtureType>) => {
      state.fixtureTypes.push(payload.id)
      state.fixtureTypesByID[payload.id] = payload
      state.editedFixture = payload.id
    },
    updateFixtureType: (state, { payload }: PayloadAction<FixtureType>) => {
      state.fixtureTypesByID[payload.id] = payload
    }
  },
});

export const { setEditedFixture, addFixture, removeFixture, addFixtureType, updateFixtureType } = dmxSlice.actions;

export default dmxSlice.reducer;