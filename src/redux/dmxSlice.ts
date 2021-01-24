import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Fixture, FixtureType, testFixtureTypes, testUniverse } from '../engine/dmxFixtures';

type DmxState = {
  universe: Fixture[]
  fixtureTypes: {[key: string]: FixtureType}
}

const initialDmxState: DmxState = {
  universe: testUniverse,
  fixtureTypes: testFixtureTypes
}

export const dmxSlice = createSlice({
  name: 'dmx',
  initialState: initialDmxState,
  reducers: {
    addFixture: (state, action: PayloadAction<Fixture>) => {
      state.universe[action.payload.channelNum] = action.payload
    },
    removeFixture: (state, action: PayloadAction<Fixture>) => {
      delete state.universe[action.payload.channelNum]
    },
    addFixtureType: (state, action: PayloadAction<FixtureType>) => {
      state.fixtureTypes[action.payload.id] = action.payload
    },
    removeFixtureType: (state, action: PayloadAction<FixtureType>) => {
      delete state.fixtureTypes[action.payload.id]
    }
  },
});

export const { addFixture, removeFixture, addFixtureType, removeFixtureType } = dmxSlice.actions;

export default dmxSlice.reducer;